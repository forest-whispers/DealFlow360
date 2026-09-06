import {
    ApprovalRequestStatus,
    ChangeRequestStatus,
    CustomerTier,
    NegotiationMessageAuthorType,
    NegotiationStatus,
    Prisma,
    QuotationRevisionStatus,
    QuotationStatus,
    UserRole,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { evaluateLineDiscount } from "@/server/modules/discount-governance/discount-calculator";
import {
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type {
    CanonicalLineEvaluationResult,
    DiscountLineContext,
    NormalizedDiscountGovernanceRules,
} from "@/server/modules/discount-governance/discount-governance.types";
import {
    calculateLineCommercials,
    calculateQuotationSummary,
    evaluateQuotationGovernance,
} from "@/server/modules/quotations/quotation.calculation";
import {
    NEGOTIABLE_QUOTATION_STATUSES,
    PORTAL_VIEWABLE_QUOTATION_STATUSES,
} from "./negotiation.constants";
import type {
    CreateChangeRequestInput,
    CreateNegotiationMessageInput,
    ListCustomerQuotationsQuery,
    PortalChangeRequestResponse,
    PortalNegotiationHistoryResponse,
    PortalNegotiationMessageResponse,
    PortalQuotationCardResponse,
    PortalQuotationDetailResponse,
    PortalQuotationListResponse,
} from "./negotiation.types";

export class NegotiationService {
    // ==========================================
    // Internal Helper: Resolve Governance Rules
    // ==========================================
    private async resolveGovernanceRules(
        organizationId: string,
        customerTier: CustomerTier | null,
        categories: string[],
    ) {
        const uniqueCategories = Array.from(new Set(categories));

        const [tierRule, categoryRules, approvalPolicy] = await Promise.all([
            customerTier
                ? prisma.discountTierRule.findFirst({
                      where: {
                          organizationId,
                          customerTier,
                          isActive: true,
                      },
                  })
                : null,
            prisma.discountCategoryRule.findMany({
                where: {
                    organizationId,
                    category: { in: uniqueCategories },
                    isActive: true,
                },
            }),
            prisma.discountApprovalPolicy.findUnique({
                where: {
                    organizationId,
                },
            }),
        ]);

        if (!approvalPolicy) {
            throw new BadRequestError(
                "Discount approval policy is not configured for this organization.",
            );
        }

        const categoryRuleMap = new Map(
            categoryRules.map((r) => [
                r.category,
                r.maximumDiscountPercent.toNumber(),
            ]),
        );

        return {
            customerTierLimit: tierRule
                ? tierRule.maximumDiscountPercent.toNumber()
                : null,
            categoryRuleMap,
            salesManagerThreshold: approvalPolicy.salesManagerThreshold.toNumber(),
            financeOperationsThreshold:
                approvalPolicy.financeOperationsThreshold.toNumber(),
        };
    }

    // ==========================================
    // 1. List Customer Quotations (Portal)
    // ==========================================
    async listCustomerQuotations(
        user: AuthenticatedUser,
        query: ListCustomerQuotationsQuery,
    ): Promise<PortalQuotationListResponse> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.QuotationWhereInput = {
            customerId: user.id,
            organizationId: user.organizationId,
            status: { in: PORTAL_VIEWABLE_QUOTATION_STATUSES },
        };

        const [quotations, total] = await Promise.all([
            prisma.quotation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    quoteNumber: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        select: {
                            total: true,
                            revisionNumber: true,
                        },
                    },
                },
            }),
            prisma.quotation.count({ where }),
        ]);

        const cards: PortalQuotationCardResponse[] = quotations.map((q) => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            status: q.status,
            total: q.revisions[0]?.total.toNumber() ?? 0,
            revisionNumber: q.revisions[0]?.revisionNumber ?? 1,
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
        }));

        return {
            quotations: cards,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    // ==========================================
    // 2. Get Customer Quotation By ID (Portal)
    // ==========================================
    async getCustomerQuotationById(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<PortalQuotationDetailResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                customerId: user.id,
                organizationId: user.organizationId,
                status: { in: PORTAL_VIEWABLE_QUOTATION_STATUSES },
            },
            select: {
                id: true,
                quoteNumber: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        revisionNumber: true,
                        status: true,
                        orderDiscountPercent: true,
                        subtotal: true,
                        lineDiscountTotal: true,
                        orderDiscount: true,
                        total: true,
                        lines: {
                            orderBy: { lineNumber: "asc" },
                            select: {
                                lineNumber: true,
                                productId: true,
                                name: true,
                                sku: true,
                                category: true,
                                quantity: true,
                                unitPrice: true,
                                discountPercent: true,
                                lineSubtotal: true,
                                lineDiscount: true,
                                lineTotal: true,
                            },
                        },
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        return {
            id: quotation.id,
            quoteNumber: quotation.quoteNumber,
            status: quotation.status,
            createdAt: quotation.createdAt.toISOString(),
            updatedAt: quotation.updatedAt.toISOString(),
            revision: {
                id: revision.id,
                revisionNumber: revision.revisionNumber,
                status: revision.status,
                orderDiscountPercent: revision.orderDiscountPercent.toNumber(),
                summary: {
                    subtotal: revision.subtotal.toNumber(),
                    lineDiscountTotal: revision.lineDiscountTotal.toNumber(),
                    orderDiscount: revision.orderDiscount.toNumber(),
                    total: revision.total.toNumber(),
                },
                lines: revision.lines.map((line) => ({
                    lineNumber: line.lineNumber,
                    productId: line.productId,
                    name: line.name,
                    sku: line.sku,
                    category: line.category,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice.toNumber(),
                    discountPercent: line.discountPercent.toNumber(),
                    lineSubtotal: line.lineSubtotal.toNumber(),
                    lineDiscount: line.lineDiscount.toNumber(),
                    lineTotal: line.lineTotal.toNumber(),
                })),
            },
        };
    }

    // ==========================================
    // 3. Send Negotiation Message (Portal)
    // ==========================================
    async sendNegotiationMessage(
        user: AuthenticatedUser,
        quotationId: string,
        input: CreateNegotiationMessageInput,
    ): Promise<PortalNegotiationMessageResponse> {
        return prisma.$transaction(async (tx) => {
            const quotation = await tx.quotation.findFirst({
                where: {
                    id: quotationId,
                    customerId: user.id,
                    organizationId: user.organizationId,
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            if (quotation.status === QuotationStatus.CONFIRMED) {
                throw new BadRequestError("Quotation already confirmed.");
            }

            if (!NEGOTIABLE_QUOTATION_STATUSES.includes(quotation.status)) {
                throw new BadRequestError("Quotation cannot enter negotiation.");
            }

            // If quotation is SENT, transition to UNDER_NEGOTIATION atomically
            if (quotation.status === QuotationStatus.SENT) {
                await tx.quotation.update({
                    where: { id: quotation.id },
                    data: { status: QuotationStatus.UNDER_NEGOTIATION },
                });
            }

            // Find or create active negotiation
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

            // Create negotiation message
            const message = await tx.negotiationMessage.create({
                data: {
                    negotiationId: negotiation.id,
                    authorId: user.id,
                    authorType: NegotiationMessageAuthorType.CUSTOMER,
                    message: input.message.trim(),
                },
            });

            return {
                id: message.id,
                authorType: message.authorType,
                authorName: user.name,
                message: message.message,
                createdAt: message.createdAt.toISOString(),
            };
        });
    }

    // ==========================================
    // 4. Request Commercial Change (Proposal -> New Revision)
    // ==========================================
    async requestCommercialChange(
        user: AuthenticatedUser,
        quotationId: string,
        input: CreateChangeRequestInput,
    ): Promise<PortalQuotationDetailResponse> {
        return prisma.$transaction(async (tx) => {
            const quotation = await tx.quotation.findFirst({
                where: {
                    id: quotationId,
                    customerId: user.id,
                    organizationId: user.organizationId,
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            customerTier: true,
                            role: true,
                            isActive: true,
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
                                where: { status: ApprovalRequestStatus.PENDING },
                            },
                        },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            if (quotation.status === QuotationStatus.CONFIRMED) {
                throw new BadRequestError("Quotation already confirmed.");
            }

            if (!NEGOTIABLE_QUOTATION_STATUSES.includes(quotation.status)) {
                throw new BadRequestError("Quotation cannot enter negotiation.");
            }

            const activeRevision = quotation.revisions[0];
            if (!activeRevision) {
                throw new NotFoundError("Quotation revision not found.");
            }

            // Prevent conflicting concurrent pending proposals
            if (
                activeRevision.approvalRequests.length > 0 ||
                activeRevision.status === QuotationRevisionStatus.PENDING_APPROVAL
            ) {
                throw new BadRequestError(
                    "A commercial proposal is already pending approval.",
                );
            }

            // Verify target line exists if lineNumber is specified
            let targetLine = null;
            if (input.lineNumber !== undefined) {
                targetLine = activeRevision.lines.find(
                    (l) => l.lineNumber === input.lineNumber,
                );
                if (!targetLine) {
                    throw new BadRequestError(
                        `Quotation line ${input.lineNumber} not found.`,
                    );
                }
            }

            // Reject empty or no-op changes
            const isLineQtySame =
                input.quantity === undefined ||
                (targetLine !== null && targetLine.quantity === input.quantity);
            const isLineDiscSame =
                input.discountPercent === undefined ||
                (targetLine !== null &&
                    targetLine.discountPercent.toNumber() === input.discountPercent);
            const isOrderDiscSame =
                input.orderDiscountPercent === undefined ||
                activeRevision.orderDiscountPercent.toNumber() ===
                    input.orderDiscountPercent;

            if (isLineQtySame && isLineDiscSame && isOrderDiscSame) {
                throw new BadRequestError(
                    "The requested commercial changes are identical to current quotation values.",
                );
            }

            // Find or create active negotiation
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

            // Persist ChangeRequest
            await tx.changeRequest.create({
                data: {
                    negotiationId: negotiation.id,
                    requestedById: user.id,
                    lineNumber: input.lineNumber ?? null,
                    quantity: input.quantity ?? null,
                    discountPercent:
                        input.discountPercent !== undefined
                            ? new Prisma.Decimal(input.discountPercent)
                            : null,
                    orderDiscountPercent:
                        input.orderDiscountPercent !== undefined
                            ? new Prisma.Decimal(input.orderDiscountPercent)
                            : null,
                    message: input.message?.trim() ?? null,
                    status: ChangeRequestStatus.PENDING,
                },
            });

            // Validate proposed commercial changes against governance without mutating activeRevision
            const newOrderDiscountPercent =
                input.orderDiscountPercent ??
                activeRevision.orderDiscountPercent.toNumber();

            const computedLines = activeRevision.lines.map((line) => {
                const quantity =
                    input.lineNumber === line.lineNumber &&
                    input.quantity !== undefined
                        ? input.quantity
                        : line.quantity;
                const discountPercent =
                    input.lineNumber === line.lineNumber &&
                    input.discountPercent !== undefined
                        ? input.discountPercent
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

            const summary = calculateQuotationSummary(
                computedLines,
                newOrderDiscountPercent,
            );

            // Run existing deterministic discount governance
            const categories = computedLines.map((l) => l.category);
            const governance = await this.resolveGovernanceRules(
                user.organizationId,
                quotation.customer.customerTier,
                categories,
            );

            const lineEvals: CanonicalLineEvaluationResult[] = [];
            for (const line of computedLines) {
                const categoryLimit =
                    governance.categoryRuleMap.get(line.category) ?? null;

                const normalizedRules: NormalizedDiscountGovernanceRules = {
                    customerTierLimit: governance.customerTierLimit,
                    categoryLimit,
                    salesManagerThreshold: governance.salesManagerThreshold,
                    financeOperationsThreshold:
                        governance.financeOperationsThreshold,
                };

                const context: DiscountLineContext = {
                    lineId: line.lineNumber,
                    customerTier: quotation.customer.customerTier ?? "BRONZE",
                    productCategory: line.category,
                    discountPercent: line.discountPercent,
                };

                const evaluation = evaluateLineDiscount(context, normalizedRules);
                lineEvals.push(evaluation);
            }

            const quotationEvaluation = evaluateQuotationGovernance({
                lineEvaluations: lineEvals,
                orderDiscountPercent: newOrderDiscountPercent,
                customerTierLimit: governance.customerTierLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold:
                    governance.financeOperationsThreshold,
                subtotal: summary.subtotal,
                lineDiscountTotal: summary.lineDiscountTotal,
                orderDiscount: summary.orderDiscount,
                marginPercent: summary.marginPercent,
            });

            // Enforce hard ceiling: roll back if rejected
            if (quotationEvaluation.status === EvaluationStatus.REJECTED) {
                throw new BadRequestError(
                    quotationEvaluation.message ||
                        "Requested discount exceeds the maximum allowable discount limit.",
                );
            }

            // Invariant: Customer negotiation request is a proposal/intent only.
            // It MUST NEVER create or mutate a QuotationRevision.
            // The active revision, effective discount, totals, and commercial terms
            // remain authoritative and unchanged until internal sales explicitly proposes/executes revised terms.
            if (quotation.status !== QuotationStatus.UNDER_NEGOTIATION) {
                await tx.quotation.update({
                    where: { id: quotation.id },
                    data: { status: QuotationStatus.UNDER_NEGOTIATION },
                });
            }

            // Return customer-safe projection of the authoritative ACTIVE revision (unchanged)
            return {
                id: quotation.id,
                quoteNumber: quotation.quoteNumber,
                status: QuotationStatus.UNDER_NEGOTIATION,
                createdAt: quotation.createdAt.toISOString(),
                updatedAt: new Date().toISOString(),
                revision: {
                    id: activeRevision.id,
                    revisionNumber: activeRevision.revisionNumber,
                    status: activeRevision.status,
                    orderDiscountPercent:
                        activeRevision.orderDiscountPercent.toNumber(),
                    summary: {
                        subtotal: activeRevision.subtotal.toNumber(),
                        lineDiscountTotal:
                            activeRevision.lineDiscountTotal.toNumber(),
                        orderDiscount: activeRevision.orderDiscount.toNumber(),
                        total: activeRevision.total.toNumber(),
                    },
                    lines: activeRevision.lines.map((line) => ({
                        lineNumber: line.lineNumber,
                        productId: line.productId,
                        name: line.name,
                        sku: line.sku,
                        category: line.category,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice.toNumber(),
                        discountPercent: line.discountPercent.toNumber(),
                        lineSubtotal: line.lineSubtotal.toNumber(),
                        lineDiscount: line.lineDiscount.toNumber(),
                        lineTotal: line.lineTotal.toNumber(),
                    })),
                },
            };
        });
    }

    // ==========================================
    // 5. Confirm Quotation (Portal)
    // ==========================================
    async confirmQuotation(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<PortalQuotationDetailResponse> {
        return prisma.$transaction(async (tx) => {
            const quotation = await tx.quotation.findFirst({
                where: {
                    id: quotationId,
                    customerId: user.id,
                    organizationId: user.organizationId,
                },
                include: {
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        include: {
                            lines: {
                                orderBy: { lineNumber: "asc" },
                            },
                            approvalRequests: {
                                where: { status: ApprovalRequestStatus.PENDING },
                            },
                        },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            if (quotation.status === QuotationStatus.CONFIRMED) {
                throw new BadRequestError("Quotation already confirmed.");
            }

            const latestRevision = quotation.revisions[0];
            if (!latestRevision) {
                throw new NotFoundError("Quotation revision not found.");
            }

            // Customer must only be able to confirm the latest authoritative revision
            // If the latest revision is PENDING_APPROVAL, fail immediately
            if (
                latestRevision.approvalRequests.length > 0 ||
                latestRevision.status === QuotationRevisionStatus.PENDING_APPROVAL
            ) {
                throw new BadRequestError(
                    "Pending approval exists. Quotation cannot be confirmed until approved.",
                );
            }

            if (
                latestRevision.status !== QuotationRevisionStatus.APPROVED &&
                latestRevision.status !== QuotationRevisionStatus.SENT
            ) {
                throw new BadRequestError(
                    "Quotation is not in a confirmable state. Latest revision is not approved.",
                );
            }

            // Transition quotation and latest revision to CONFIRMED
            await tx.quotationRevision.update({
                where: { id: latestRevision.id },
                data: { status: QuotationRevisionStatus.CONFIRMED },
            });

            await tx.quotation.update({
                where: { id: quotation.id },
                data: { status: QuotationStatus.CONFIRMED },
            });

            // Resolve active negotiation if any and accept latest pending change request
            const activeNegotiation = await tx.negotiation.findFirst({
                where: {
                    quotationId: quotation.id,
                    status: NegotiationStatus.ACTIVE,
                },
            });

            if (activeNegotiation) {
                await tx.negotiation.update({
                    where: { id: activeNegotiation.id },
                    data: { status: NegotiationStatus.RESOLVED },
                });

                // Mark only the latest PENDING change request as ACCEPTED
                const latestPendingChangeRequest =
                    await tx.changeRequest.findFirst({
                        where: {
                            negotiationId: activeNegotiation.id,
                            status: ChangeRequestStatus.PENDING,
                        },
                        orderBy: { createdAt: "desc" },
                    });

                if (latestPendingChangeRequest) {
                    await tx.changeRequest.update({
                        where: { id: latestPendingChangeRequest.id },
                        data: { status: ChangeRequestStatus.ACCEPTED },
                    });
                }
            }

            return {
                id: quotation.id,
                quoteNumber: quotation.quoteNumber,
                status: QuotationStatus.CONFIRMED,
                createdAt: quotation.createdAt.toISOString(),
                updatedAt: new Date().toISOString(),
                revision: {
                    id: latestRevision.id,
                    revisionNumber: latestRevision.revisionNumber,
                    status: QuotationRevisionStatus.CONFIRMED,
                    orderDiscountPercent:
                        latestRevision.orderDiscountPercent.toNumber(),
                    summary: {
                        subtotal: latestRevision.subtotal.toNumber(),
                        lineDiscountTotal:
                            latestRevision.lineDiscountTotal.toNumber(),
                        orderDiscount: latestRevision.orderDiscount.toNumber(),
                        total: latestRevision.total.toNumber(),
                    },
                    lines: latestRevision.lines.map((line) => ({
                        lineNumber: line.lineNumber,
                        productId: line.productId,
                        name: line.name,
                        sku: line.sku,
                        category: line.category,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice.toNumber(),
                        discountPercent: line.discountPercent.toNumber(),
                        lineSubtotal: line.lineSubtotal.toNumber(),
                        lineDiscount: line.lineDiscount.toNumber(),
                        lineTotal: line.lineTotal.toNumber(),
                    })),
                },
            };
        });
    }

    // ==========================================
    // 6. Get Negotiation History (Portal & Internal Sales)
    // ==========================================
    async getNegotiationHistory(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<PortalNegotiationHistoryResponse> {
        const isCustomer = user.role === UserRole.CUSTOMER;
        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                organizationId: user.organizationId,
                ...(isCustomer
                    ? {
                          customerId: user.id,
                          status: { in: PORTAL_VIEWABLE_QUOTATION_STATUSES },
                      }
                    : {}),
            },
            select: { id: true },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const negotiation = await prisma.negotiation.findFirst({
            where: {
                quotationId: quotation.id,
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        author: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                changeRequests: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!negotiation) {
            return {
                quotationId: quotation.id,
                status: "NO_NEGOTIATION",
                messages: [],
                changeRequests: [],
            };
        }

        const messages: PortalNegotiationMessageResponse[] =
            negotiation.messages.map((m) => ({
                id: m.id,
                authorType: m.authorType,
                authorName: m.author.name,
                message: m.message,
                createdAt: m.createdAt.toISOString(),
            }));

        const changeRequests: PortalChangeRequestResponse[] =
            negotiation.changeRequests.map((c) => ({
                id: c.id,
                lineNumber: c.lineNumber,
                quantity: c.quantity,
                discountPercent: c.discountPercent?.toNumber() ?? null,
                orderDiscountPercent: c.orderDiscountPercent?.toNumber() ?? null,
                message: c.message,
                status: c.status,
                createdAt: c.createdAt.toISOString(),
            }));

        return {
            quotationId: quotation.id,
            status: negotiation.status,
            messages,
            changeRequests,
        };
    }

    // ==========================================
    // 7. Decline Customer Change Request (Internal Sales)
    // ==========================================
    async declineChangeRequest(
        user: AuthenticatedUser,
        quotationId: string,
        changeRequestId: string,
        reason?: string,
    ): Promise<PortalChangeRequestResponse> {
        return prisma.$transaction(async (tx) => {
            const quotation = await tx.quotation.findFirst({
                where: {
                    id: quotationId,
                    organizationId: user.organizationId,
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            const changeRequest = await tx.changeRequest.findFirst({
                where: {
                    id: changeRequestId,
                    negotiation: { quotationId: quotation.id },
                },
                include: {
                    negotiation: true,
                },
            });

            if (!changeRequest) {
                throw new NotFoundError("Change request not found.");
            }

            if (changeRequest.status !== ChangeRequestStatus.PENDING) {
                throw new BadRequestError(
                    "Only pending change requests can be declined.",
                );
            }

            const updated = await tx.changeRequest.update({
                where: { id: changeRequestId },
                data: {
                    status: ChangeRequestStatus.REJECTED,
                },
            });

            if (reason && reason.trim().length > 0) {
                await tx.negotiationMessage.create({
                    data: {
                        negotiationId: changeRequest.negotiationId,
                        authorId: user.id,
                        authorType: NegotiationMessageAuthorType.SALES_REP,
                        message: `Change request declined: ${reason.trim()}`,
                    },
                });
            }

            return {
                id: updated.id,
                lineNumber: updated.lineNumber,
                quantity: updated.quantity,
                discountPercent: updated.discountPercent?.toNumber() ?? null,
                orderDiscountPercent:
                    updated.orderDiscountPercent?.toNumber() ?? null,
                message: updated.message,
                status: updated.status,
                createdAt: updated.createdAt.toISOString(),
            };
        });
    }
}

export const negotiationService = new NegotiationService();
