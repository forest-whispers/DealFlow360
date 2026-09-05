/**
 * Deterministic Negotiation Execution Service (V1)
 *
 * Safely converts an already-interpreted, structured NegotiationIntent into an
 * immutable quotation revision N+1, negotiation ChangeRequest records, and sequenced
 * ApprovalRequest steps (if required).
 *
 * 100% deterministic backend business logic. Zero AI / LLM calls.
 * Committed atomically inside a single database transaction.
 */

import { prisma } from "@/server/shared/db/prisma";
import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    ApprovalStepStatus,
    ChangeRequestStatus,
    NegotiationStatus,
    Prisma,
    QuotationRevisionStatus,
    QuotationStatus,
} from "@prisma/client";
import {
    calculateLineCommercials,
    calculateQuotationSummary,
    evaluateQuotationGovernance,
} from "@/server/modules/quotations/quotation.calculation";
import { evaluateLineDiscount } from "@/server/modules/discount-governance/discount-calculator";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type {
    CanonicalLineEvaluationResult,
    DiscountLineContext,
    NormalizedDiscountGovernanceRules,
} from "@/server/modules/discount-governance/discount-governance.types";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    ValidationError,
} from "@/server/shared/errors/errors";
import { NEGOTIABLE_QUOTATION_STATUSES } from "@/server/modules/negotiation/negotiation.constants";
import type {
    ExecuteNegotiationIntentInput,
    NegotiationExecutionChangeItem,
    NegotiationExecutionResult,
} from "./negotiation.types";

export class NegotiationExecutionService {
    /**
     * Atomically executes a structured negotiation intent against an authoritative quotation revision.
     */
    async executeIntent(
        user: AuthenticatedUser,
        quotationId: string,
        input: ExecuteNegotiationIntentInput,
    ): Promise<NegotiationExecutionResult> {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Transactional Row-Level Lock with tenant isolation & anti-enumeration
                const lockedRows = await tx.$queryRaw<
                    Array<{ id: string; customerId: string }>
                >`
                    SELECT id, "customerId"
                    FROM "Quotation"
                    WHERE id = ${quotationId} AND "organizationId" = ${user.organizationId}
                    FOR UPDATE
                `;

                if (!lockedRows || lockedRows.length === 0) {
                    throw new NotFoundError("Quotation not found.");
                }

                if (
                    user.role === "CUSTOMER" &&
                    lockedRows[0].customerId !== user.id
                ) {
                    throw new NotFoundError("Quotation not found.");
                }

                // 2. Fetch authoritative quotation with customer and latest revision
                const quotation = await tx.quotation.findFirst({
                    where: {
                        id: quotationId,
                        organizationId: user.organizationId,
                        ...(user.role === "CUSTOMER"
                            ? { customerId: user.id }
                            : {}),
                    },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                customerTier: true,
                            },
                        },
                        revisions: {
                            orderBy: { revisionNumber: "desc" },
                            take: 1,
                            include: {
                                lines: {
                                    orderBy: { lineNumber: "asc" },
                                },
                                approvalRequests: {
                                    where: {
                                        status: ApprovalRequestStatus.PENDING,
                                    },
                                },
                            },
                        },
                    },
                });

                if (!quotation) {
                    throw new NotFoundError("Quotation not found.");
                }

                // 3. Validate quotation negotiation lifecycle state
                if (quotation.status === QuotationStatus.CONFIRMED) {
                    throw new ConflictError("Quotation already confirmed.");
                }

                if (!NEGOTIABLE_QUOTATION_STATUSES.includes(quotation.status)) {
                    throw new ConflictError(
                        "Quotation cannot enter negotiation in its current status.",
                    );
                }

                const latestRevision = quotation.revisions[0];
                if (!latestRevision) {
                    throw new NotFoundError("Quotation revision not found.");
                }

                // 4. Unresolved approval & active proposal guard
                const activeApproval = await tx.approvalRequest.findFirst({
                    where: {
                        quotationId: quotation.id,
                        status: ApprovalRequestStatus.PENDING,
                    },
                });

                if (
                    activeApproval ||
                    latestRevision.approvalRequests.length > 0 ||
                    latestRevision.status ===
                        QuotationRevisionStatus.PENDING_APPROVAL
                ) {
                    throw new ConflictError(
                        "A commercial proposal is already pending approval.",
                    );
                }

                // 5. Authoritative stale intent guard
                if (
                    input.sourceRevisionId !== latestRevision.id ||
                    input.sourceRevisionNumber !== latestRevision.revisionNumber
                ) {
                    throw new ConflictError(
                        "Negotiation intent is stale. A newer quotation revision exists.",
                    );
                }

                // 6. In-memory line validation & duplicate/no-op checks
                const seenChangeKeys = new Set<string>();
                for (const change of input.changes) {
                    const targetLine = latestRevision.lines.find(
                        (l) => l.lineNumber === change.lineNumber,
                    );
                    if (!targetLine) {
                        throw new ValidationError(
                            `Quotation line ${change.lineNumber} not found.`,
                        );
                    }

                    const key = `${change.lineNumber}:${change.type}`;
                    if (seenChangeKeys.has(key)) {
                        throw new ValidationError(
                            `Conflicting duplicate change of type ${change.type} for line ${change.lineNumber}.`,
                        );
                    }
                    seenChangeKeys.add(key);
                }

                // Check for no-op changes
                let hasMeaningfulChange = false;
                for (const change of input.changes) {
                    const line = latestRevision.lines.find(
                        (l) => l.lineNumber === change.lineNumber,
                    )!;
                    if (change.type === "LINE_QUANTITY") {
                        if (change.quantity !== line.quantity) {
                            hasMeaningfulChange = true;
                        }
                    } else if (change.type === "LINE_DISCOUNT") {
                        if (
                            change.discountPercent !==
                            line.discountPercent.toNumber()
                        ) {
                            hasMeaningfulChange = true;
                        }
                    }
                }

                if (!hasMeaningfulChange) {
                    throw new ValidationError(
                        "The requested commercial changes are identical to current quotation values.",
                    );
                }

                // 7. Consolidate changes by lineNumber
                const lineChangesMap = new Map<
                    number,
                    { quantity?: number; discountPercent?: number }
                >();
                for (const change of input.changes) {
                    const existing =
                        lineChangesMap.get(change.lineNumber) ?? {};
                    if (change.type === "LINE_QUANTITY") {
                        existing.quantity = change.quantity;
                    } else if (change.type === "LINE_DISCOUNT") {
                        existing.discountPercent = change.discountPercent;
                    }
                    lineChangesMap.set(change.lineNumber, existing);
                }

                // 8. Recalculate ALL lines (unchanged and changed)
                const computedLines = latestRevision.lines.map((line) => {
                    const lineMod = lineChangesMap.get(line.lineNumber);
                    const quantity =
                        lineMod?.quantity !== undefined
                            ? lineMod.quantity
                            : line.quantity;
                    const discountPercent =
                        lineMod?.discountPercent !== undefined
                            ? lineMod.discountPercent
                            : line.discountPercent.toNumber();

                    const commercials = calculateLineCommercials({
                        quantity,
                        unitPrice: line.unitPrice.toNumber(),
                        unitCost: line.unitCost.toNumber(),
                        discountPercent,
                    });

                    return {
                        productId: line.productId,
                        variantId: line.variantId,
                        lineNumber: line.lineNumber,
                        name: line.name,
                        sku: line.sku,
                        category: line.category,
                        quantity,
                        unitPrice: line.unitPrice.toNumber(),
                        unitCost: line.unitCost.toNumber(),
                        discountPercent,
                        lineSubtotal: commercials.lineSubtotal,
                        lineDiscount: commercials.lineDiscount,
                        lineTotal: commercials.lineTotal,
                        margin: commercials.margin,
                        marginPercent: commercials.marginPercent,
                    };
                });

                const newOrderDiscountPercent =
                    latestRevision.orderDiscountPercent.toNumber();
                const summary = calculateQuotationSummary(
                    computedLines,
                    newOrderDiscountPercent,
                );

                // 9. Evaluate discount governance across all lines & whole quotation
                const uniqueCategories = Array.from(
                    new Set(computedLines.map((l) => l.category)),
                );
                const customerTier = quotation.customer?.customerTier ?? null;

                const [tierRule, categoryRules, approvalPolicy] =
                    await Promise.all([
                        customerTier
                            ? tx.discountTierRule.findFirst({
                                  where: {
                                      organizationId: user.organizationId,
                                      customerTier,
                                      isActive: true,
                                  },
                              })
                            : null,
                        tx.discountCategoryRule.findMany({
                            where: {
                                organizationId: user.organizationId,
                                category: { in: uniqueCategories },
                                isActive: true,
                            },
                        }),
                        tx.discountApprovalPolicy.findUnique({
                            where: {
                                organizationId: user.organizationId,
                            },
                        }),
                    ]);

                if (!approvalPolicy) {
                    throw new BadRequestError(
                        "Discount approval policy is not configured for this organization.",
                    );
                }

                const categoryRuleMap = new Map<string, number>(
                    categoryRules.map((r) => [
                        r.category,
                        r.maximumDiscountPercent.toNumber(),
                    ]),
                );
                const customerTierLimit = tierRule
                    ? tierRule.maximumDiscountPercent.toNumber()
                    : null;
                const salesManagerThreshold =
                    approvalPolicy.salesManagerThreshold.toNumber();
                const financeOperationsThreshold =
                    approvalPolicy.financeOperationsThreshold.toNumber();

                const lineEvals: CanonicalLineEvaluationResult[] = [];
                for (const line of computedLines) {
                    const categoryLimit =
                        categoryRuleMap.get(line.category) ?? null;
                    const normalizedRules: NormalizedDiscountGovernanceRules = {
                        customerTierLimit,
                        categoryLimit,
                        salesManagerThreshold,
                        financeOperationsThreshold,
                    };

                    const context: DiscountLineContext = {
                        lineId: line.lineNumber,
                        customerTier: customerTier ?? "BRONZE",
                        productCategory: line.category,
                        discountPercent: line.discountPercent,
                    };

                    lineEvals.push(
                        evaluateLineDiscount(context, normalizedRules),
                    );
                }

                const quotationEvaluation = evaluateQuotationGovernance({
                    lineEvaluations: lineEvals,
                    orderDiscountPercent: newOrderDiscountPercent,
                    customerTierLimit,
                    salesManagerThreshold,
                    financeOperationsThreshold,
                    subtotal: summary.subtotal,
                    lineDiscountTotal: summary.lineDiscountTotal,
                    orderDiscount: summary.orderDiscount,
                    marginPercent: summary.marginPercent,
                });

                // Enforce hard discount ceiling: roll back transaction with 422
                if (quotationEvaluation.status === EvaluationStatus.REJECTED) {
                    throw new ValidationError(
                        quotationEvaluation.message ||
                            "Requested discount exceeds the maximum allowable discount limit.",
                    );
                }

                // 10. Determine Revision N+1 status
                let newRevisionStatus: QuotationRevisionStatus;
                if (
                    quotationEvaluation.status ===
                    EvaluationStatus.APPROVAL_REQUIRED
                ) {
                    newRevisionStatus = QuotationRevisionStatus.PENDING_APPROVAL;
                } else {
                    newRevisionStatus = QuotationRevisionStatus.APPROVED;
                }

                // 11. Persist immutable Revision N+1 with all lines
                const newRevisionNumber = latestRevision.revisionNumber + 1;
                const createdRevision = await tx.quotationRevision.create({
                    data: {
                        quotationId: quotation.id,
                        revisionNumber: newRevisionNumber,
                        status: newRevisionStatus,
                        orderDiscountPercent: new Prisma.Decimal(
                            newOrderDiscountPercent,
                        ),
                        subtotal: new Prisma.Decimal(summary.subtotal),
                        lineDiscountTotal: new Prisma.Decimal(
                            summary.lineDiscountTotal,
                        ),
                        orderDiscount: new Prisma.Decimal(
                            summary.orderDiscount,
                        ),
                        total: new Prisma.Decimal(summary.total),
                        margin: new Prisma.Decimal(summary.margin),
                        marginPercent: new Prisma.Decimal(
                            summary.marginPercent,
                        ),
                        lines: {
                            create: computedLines.map((line) => ({
                                productId: line.productId,
                                variantId: line.variantId,
                                lineNumber: line.lineNumber,
                                name: line.name,
                                sku: line.sku,
                                category: line.category,
                                quantity: line.quantity,
                                unitPrice: new Prisma.Decimal(line.unitPrice),
                                unitCost: new Prisma.Decimal(line.unitCost),
                                discountPercent: new Prisma.Decimal(
                                    line.discountPercent,
                                ),
                                lineSubtotal: new Prisma.Decimal(
                                    line.lineSubtotal,
                                ),
                                lineDiscount: new Prisma.Decimal(
                                    line.lineDiscount,
                                ),
                                lineTotal: new Prisma.Decimal(line.lineTotal),
                                margin: new Prisma.Decimal(line.margin),
                                marginPercent: new Prisma.Decimal(
                                    line.marginPercent,
                                ),
                            })),
                        },
                    },
                });

                // 12. Find or create active negotiation
                let negotiation = await tx.negotiation.findFirst({
                    where: {
                        quotationId: quotation.id,
                        status: NegotiationStatus.ACTIVE,
                    },
                });

                if (!negotiation) {
                    negotiation = await tx.negotiation.create({
                        data: {
                            quotationId: quotation.id,
                            status: NegotiationStatus.ACTIVE,
                        },
                    });
                }

                // 13. Persist consolidated ChangeRequest records per modified line
                for (const [lineNumber, ch] of lineChangesMap.entries()) {
                    await tx.changeRequest.create({
                        data: {
                            negotiationId: negotiation.id,
                            requestedById: user.id,
                            lineNumber,
                            quantity: ch.quantity ?? null,
                            discountPercent:
                                ch.discountPercent !== undefined
                                    ? new Prisma.Decimal(ch.discountPercent)
                                    : null,
                            orderDiscountPercent: null,
                            message: "AI-negotiated commercial proposal",
                            status: ChangeRequestStatus.PENDING,
                        },
                    });
                }

                // 14. Persist ApprovalRequest and sequenced steps if required
                let createdApprovalRequest: { id: string } | null = null;
                if (
                    newRevisionStatus ===
                    QuotationRevisionStatus.PENDING_APPROVAL
                ) {
                    const stepsData: Prisma.ApprovalStepCreateWithoutApprovalRequestInput[] =
                        [
                            {
                                level: ApprovalStepLevel.SALES_MANAGER,
                                status: ApprovalStepStatus.PENDING,
                            },
                        ];

                    if (
                        quotationEvaluation.approvalLevel ===
                        DiscountApprovalLevel.FINANCE_OPERATIONS
                    ) {
                        stepsData.push({
                            level: ApprovalStepLevel.FINANCE_OPERATIONS,
                            status: ApprovalStepStatus.PENDING,
                        });
                    }

                    createdApprovalRequest = await tx.approvalRequest.create({
                        data: {
                            quotationId: quotation.id,
                            revisionId: createdRevision.id,
                            status: ApprovalRequestStatus.PENDING,
                            steps: {
                                create: stepsData,
                            },
                        },
                    });
                }

                // 15. Transition quotation status to UNDER_NEGOTIATION if SENT
                const updatedQuotationStatus =
                    quotation.status === QuotationStatus.SENT
                        ? QuotationStatus.UNDER_NEGOTIATION
                        : quotation.status;

                if (quotation.status === QuotationStatus.SENT) {
                    await tx.quotation.update({
                        where: { id: quotation.id },
                        data: { status: QuotationStatus.UNDER_NEGOTIATION },
                    });
                }

                // 16. Format typed changes response
                const changesResult: NegotiationExecutionChangeItem[] = [];
                for (const [lineNumber, ch] of lineChangesMap.entries()) {
                    const beforeLine = latestRevision.lines.find(
                        (l) => l.lineNumber === lineNumber,
                    )!;
                    const afterLine = computedLines.find(
                        (l) => l.lineNumber === lineNumber,
                    )!;
                    const qtyChanged =
                        ch.quantity !== undefined &&
                        ch.quantity !== beforeLine.quantity;
                    const discChanged =
                        ch.discountPercent !== undefined &&
                        ch.discountPercent !==
                            beforeLine.discountPercent.toNumber();

                    let changeType = "UNKNOWN";
                    if (qtyChanged && discChanged) {
                        changeType = "LINE_QUANTITY_AND_DISCOUNT";
                    } else if (qtyChanged) {
                        changeType = "LINE_QUANTITY";
                    } else if (discChanged) {
                        changeType = "LINE_DISCOUNT";
                    }

                    changesResult.push({
                        lineNumber,
                        name: beforeLine.name,
                        changeType,
                        before: {
                            quantity: beforeLine.quantity,
                            discountPercent:
                                beforeLine.discountPercent.toNumber(),
                            lineTotal: beforeLine.lineTotal.toNumber(),
                        },
                        after: {
                            quantity: afterLine.quantity,
                            discountPercent: afterLine.discountPercent,
                            lineTotal: afterLine.lineTotal,
                        },
                    });
                }

                // Sort changes by lineNumber
                changesResult.sort((a, b) => a.lineNumber - b.lineNumber);

                return {
                    quotation: {
                        id: quotation.id,
                        quoteNumber: quotation.quoteNumber,
                        status: updatedQuotationStatus,
                    },
                    revision: {
                        id: createdRevision.id,
                        revisionNumber: createdRevision.revisionNumber,
                        status: createdRevision.status,
                    },
                    negotiation: {
                        id: negotiation.id,
                        status: negotiation.status,
                    },
                    changes: changesResult,
                    commercial: {
                        status: quotationEvaluation.status,
                        approvalLevel: quotationEvaluation.approvalLevel,
                        effectiveLimit: customerTierLimit,
                    },
                    approval: {
                        required:
                            newRevisionStatus ===
                            QuotationRevisionStatus.PENDING_APPROVAL,
                        requestId: createdApprovalRequest?.id ?? null,
                        level:
                            quotationEvaluation.approvalLevel !==
                            DiscountApprovalLevel.NONE
                                ? quotationEvaluation.approvalLevel
                                : null,
                    },
                };
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new ConflictError(
                    "Concurrent modification conflict. Please retry with the latest quotation revision.",
                );
            }
            throw error;
        }
    }
}

export const negotiationExecutionService = new NegotiationExecutionService();
