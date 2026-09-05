import { CustomerTier } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { BadRequestError } from "@/server/shared/errors/errors";
import {
    calculateLineCommercials,
    calculateQuotationSummary,
    evaluateQuotationGovernance,
    roundToTwo,
} from "@/server/modules/quotations/quotation.calculation";
import { evaluateLineDiscount } from "@/server/modules/discount-governance/discount-calculator";
import type {
    CanonicalLineEvaluationResult,
    NormalizedDiscountGovernanceRules,
} from "@/server/modules/discount-governance/discount-governance.types";
import {
    NegotiationInterpreterService,
    negotiationInterpreterService,
    type NegotiationInterpreterOptions,
} from "./negotiation.service";
import {
    NegotiationChangeType,
    NegotiationCommercialSummary,
    NegotiationInterpretationStatus,
    NegotiationLineChangePreview,
    NegotiationPreviewResult,
} from "./negotiation.types";
import type { InterpretNegotiationMessageInput } from "./negotiation.validation";

export class NegotiationPreviewService {
    constructor(
        private readonly interpreter: NegotiationInterpreterService = negotiationInterpreterService,
    ) {}

    /**
     * Previews the deterministic commercial and discount governance impact of a customer's
     * natural-language negotiation message without mutating any database state.
     *
     * Dual authorization:
     * - CUSTOMER: strictly restricted to their own quotation (customerId === user.id) in their organization.
     * - Internal roles (SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS, ADMIN): quotations in their organization.
     * - Unauthorized or cross-org access throws NotFoundError ("Quotation not found.") preserving anti-enumeration.
     *
     * In-memory recalculation & governance evaluation:
     * - Completely read-only: performs zero domain state mutations.
     * - AI foundation strictly terminates after extracting validated NegotiationIntent.
     * - Pricing, line commercials, margins, blended discounts, and governance routing are 100% deterministic.
     */
    async previewNegotiationMessage(
        user: AuthenticatedUser,
        quotationId: string,
        input: InterpretNegotiationMessageInput,
        options?: NegotiationInterpreterOptions,
    ): Promise<NegotiationPreviewResult> {
        // 1. Authoritatively resolve the quotation revision snapshot once
        const quotation = await this.interpreter.resolveNegotiationQuotation(
            user,
            quotationId,
        );

        // 2. Interpret the message using the preloaded quotation snapshot (prevents duplicate queries & race conditions)
        const interpretation = await this.interpreter.interpretMessage(
            user,
            quotationId,
            input,
            {
                ...options,
                preloadedQuotation: quotation,
            },
        );

        // 3. Short-circuit immediately if AMBIGUOUS or UNSUPPORTED
        if (
            interpretation.status === NegotiationInterpretationStatus.AMBIGUOUS ||
            interpretation.status === NegotiationInterpretationStatus.UNSUPPORTED
        ) {
            return {
                status: interpretation.status,
                intent: null,
                commercial: null,
                changes: [],
                before: null,
                after: null,
            };
        }

        // 4. Status === "INTERPRETED"
        const latestRevision = quotation.revisions[0];
        if (!latestRevision) {
            throw new BadRequestError("Quotation has no revisions.");
        }

        if (latestRevision.lines.length === 0) {
            throw new BadRequestError("Quotation has no lines.");
        }

        const customerTier = quotation.customer?.customerTier ?? null;
        const uniqueCategories = Array.from(
            new Set(latestRevision.lines.map((l) => l.category)),
        );

        // 5. Load governance rules for organization, customer tier, and categories
        const [tierRule, categoryRules, approvalPolicy] = await Promise.all([
            customerTier
                ? prisma.discountTierRule.findFirst({
                      where: {
                          organizationId: user.organizationId,
                          customerTier,
                          isActive: true,
                      },
                  })
                : null,
            prisma.discountCategoryRule.findMany({
                where: {
                    organizationId: user.organizationId,
                    category: { in: uniqueCategories },
                    isActive: true,
                },
            }),
            prisma.discountApprovalPolicy.findUnique({
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
            categoryRules.map((r) => [r.category, r.maximumDiscountPercent.toNumber()]),
        );
        const customerTierLimit = tierRule
            ? tierRule.maximumDiscountPercent.toNumber()
            : null;
        const salesManagerThreshold = approvalPolicy.salesManagerThreshold.toNumber();
        const financeOperationsThreshold =
            approvalPolicy.financeOperationsThreshold.toNumber();
        const orderDiscountPercent = latestRevision.orderDiscountPercent.toNumber();

        // 6. Calculate Baseline ("before") Commercials & Governance
        const beforeCommercials = latestRevision.lines.map((l) => {
            const comm = calculateLineCommercials({
                quantity: l.quantity,
                unitPrice: l.unitPrice.toNumber(),
                unitCost: l.unitCost.toNumber(),
                discountPercent: l.discountPercent.toNumber(),
            });
            return {
                quantity: l.quantity,
                unitCost: l.unitCost.toNumber(),
                lineSubtotal: comm.lineSubtotal,
                lineDiscount: comm.lineDiscount,
                lineTotal: comm.lineTotal,
            };
        });

        const beforeSummary = calculateQuotationSummary(
            beforeCommercials,
            orderDiscountPercent,
        );

        const beforeBlendedDiscountPercent =
            beforeSummary.subtotal > 0
                ? roundToTwo(
                      ((beforeSummary.lineDiscountTotal + beforeSummary.orderDiscount) /
                          beforeSummary.subtotal) *
                          100,
                  )
                : 0;

        const beforeLineEvals: CanonicalLineEvaluationResult[] =
            latestRevision.lines.map((l) => {
                const categoryLimit = categoryRuleMap.get(l.category) ?? null;
                const normalizedRules: NormalizedDiscountGovernanceRules = {
                    customerTierLimit,
                    categoryLimit,
                    salesManagerThreshold,
                    financeOperationsThreshold,
                };
                return evaluateLineDiscount(
                    {
                        lineId: l.lineNumber,
                        customerTier: customerTier ?? CustomerTier.BRONZE,
                        productCategory: l.category,
                        discountPercent: l.discountPercent.toNumber(),
                    },
                    normalizedRules,
                );
            });

        const beforeQuotationEval = evaluateQuotationGovernance({
            lineEvaluations: beforeLineEvals,
            orderDiscountPercent,
            customerTierLimit,
            salesManagerThreshold,
            financeOperationsThreshold,
            subtotal: beforeSummary.subtotal,
            lineDiscountTotal: beforeSummary.lineDiscountTotal,
            orderDiscount: beforeSummary.orderDiscount,
            marginPercent: beforeSummary.marginPercent,
        });

        // 7. Clone lines in memory and apply changes from NegotiationIntent
        const afterLinesMap = new Map<
            number,
            {
                lineNumber: number;
                name: string;
                sku: string | null;
                category: string;
                quantity: number;
                unitPrice: number;
                unitCost: number;
                discountPercent: number;
            }
        >();

        for (const l of latestRevision.lines) {
            afterLinesMap.set(l.lineNumber, {
                lineNumber: l.lineNumber,
                name: l.name,
                sku: l.sku,
                category: l.category,
                quantity: l.quantity,
                unitPrice: l.unitPrice.toNumber(),
                unitCost: l.unitCost.toNumber(),
                discountPercent: l.discountPercent.toNumber(),
            });
        }

        const changedLineNumbers = new Set<number>();
        for (const change of interpretation.intent!.changes) {
            const line = afterLinesMap.get(change.lineNumber);
            if (!line) {
                continue;
            }
            changedLineNumbers.add(change.lineNumber);
            if (change.type === NegotiationChangeType.LINE_DISCOUNT) {
                line.discountPercent = change.discountPercent;
            } else if (change.type === NegotiationChangeType.LINE_QUANTITY) {
                line.quantity = change.quantity;
            }
        }

        // 8. Calculate Proposed ("after") Commercials & Governance
        const afterLines = Array.from(afterLinesMap.values()).sort(
            (a, b) => a.lineNumber - b.lineNumber,
        );

        const afterCommercials = afterLines.map((l) => {
            const comm = calculateLineCommercials({
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                unitCost: l.unitCost,
                discountPercent: l.discountPercent,
            });
            return {
                quantity: l.quantity,
                unitCost: l.unitCost,
                lineSubtotal: comm.lineSubtotal,
                lineDiscount: comm.lineDiscount,
                lineTotal: comm.lineTotal,
            };
        });

        const afterSummary = calculateQuotationSummary(
            afterCommercials,
            orderDiscountPercent,
        );

        const afterBlendedDiscountPercent =
            afterSummary.subtotal > 0
                ? roundToTwo(
                      ((afterSummary.lineDiscountTotal + afterSummary.orderDiscount) /
                          afterSummary.subtotal) *
                          100,
                  )
                : 0;

        const afterLineEvals: CanonicalLineEvaluationResult[] = afterLines.map((l) => {
            const categoryLimit = categoryRuleMap.get(l.category) ?? null;
            const normalizedRules: NormalizedDiscountGovernanceRules = {
                customerTierLimit,
                categoryLimit,
                salesManagerThreshold,
                financeOperationsThreshold,
            };
            return evaluateLineDiscount(
                {
                    lineId: l.lineNumber,
                    customerTier: customerTier ?? CustomerTier.BRONZE,
                    productCategory: l.category,
                    discountPercent: l.discountPercent,
                },
                normalizedRules,
            );
        });

        const afterQuotationEval = evaluateQuotationGovernance({
            lineEvaluations: afterLineEvals,
            orderDiscountPercent,
            customerTierLimit,
            salesManagerThreshold,
            financeOperationsThreshold,
            subtotal: afterSummary.subtotal,
            lineDiscountTotal: afterSummary.lineDiscountTotal,
            orderDiscount: afterSummary.orderDiscount,
            marginPercent: afterSummary.marginPercent,
        });

        // 9. Build Changes Preview (single consolidated entry per modified line)
        const sortedChangedLineNumbers = Array.from(changedLineNumbers).sort(
            (a, b) => a - b,
        );
        const changes: NegotiationLineChangePreview[] = [];

        for (const lineNum of sortedChangedLineNumbers) {
            const orig = latestRevision.lines.find((l) => l.lineNumber === lineNum)!;
            const updated = afterLinesMap.get(lineNum)!;

            const beforeComm = calculateLineCommercials({
                quantity: orig.quantity,
                unitPrice: orig.unitPrice.toNumber(),
                unitCost: orig.unitCost.toNumber(),
                discountPercent: orig.discountPercent.toNumber(),
            });

            const afterComm = calculateLineCommercials({
                quantity: updated.quantity,
                unitPrice: updated.unitPrice,
                unitCost: updated.unitCost,
                discountPercent: updated.discountPercent,
            });

            changes.push({
                lineNumber: lineNum,
                productName: orig.name,
                sku: orig.sku,
                before: {
                    quantity: orig.quantity,
                    unitPrice: orig.unitPrice.toNumber(),
                    discountPercent: orig.discountPercent.toNumber(),
                    lineTotal: beforeComm.lineTotal,
                },
                after: {
                    quantity: updated.quantity,
                    unitPrice: updated.unitPrice,
                    discountPercent: updated.discountPercent,
                    lineTotal: afterComm.lineTotal,
                },
            });
        }

        // 10. Assemble before & after commercial summaries
        const before: NegotiationCommercialSummary = {
            subtotal: beforeSummary.subtotal,
            lineDiscountTotal: beforeSummary.lineDiscountTotal,
            orderDiscount: beforeSummary.orderDiscount,
            total: beforeSummary.total,
            margin: beforeSummary.margin,
            marginPercent: beforeSummary.marginPercent,
            blendedDiscountPercent: beforeBlendedDiscountPercent,
            governance: {
                status: beforeQuotationEval.status,
                approvalLevel: beforeQuotationEval.approvalLevel,
                message: beforeQuotationEval.message,
            },
        };

        const after: NegotiationCommercialSummary = {
            subtotal: afterSummary.subtotal,
            lineDiscountTotal: afterSummary.lineDiscountTotal,
            orderDiscount: afterSummary.orderDiscount,
            total: afterSummary.total,
            margin: afterSummary.margin,
            marginPercent: afterSummary.marginPercent,
            blendedDiscountPercent: afterBlendedDiscountPercent,
            governance: {
                status: afterQuotationEval.status,
                approvalLevel: afterQuotationEval.approvalLevel,
                message: afterQuotationEval.message,
            },
        };

        return {
            status: NegotiationInterpretationStatus.INTERPRETED,
            intent: interpretation.intent,
            commercial: after,
            changes,
            before,
            after,
        };
    }
}

export const negotiationPreviewService = new NegotiationPreviewService();
