import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    ApprovalStepStatus,
    ChangeRequestStatus,
    CustomerTier,
    FulfillmentStatus,
    InvoiceStatus,
    NegotiationStatus,
    Prisma,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import { evaluateLineDiscount } from "@/server/modules/discount-governance/discount-calculator";
import { evaluateQuotationGovernance } from "@/server/modules/quotations/quotation.calculation";
import type {
    CanonicalLineEvaluationResult,
    DiscountLineContext,
    NormalizedDiscountGovernanceRules,
} from "@/server/modules/discount-governance/discount-governance.types";
import { DISCOUNT_NEAR_LIMIT_HEADROOM_PERCENT } from "./deal-intelligence.constants";
import type {
    ApprovalRiskSignal,
    BillingRiskSignal,
    DealContext,
    DealContextApproval,
    DealContextBilling,
    DealContextCustomer,
    DealContextDiscount,
    DealContextFulfillment,
    DealContextNegotiation,
    DealContextQuotation,
    DealHealthCalculatorInput,
    DiscountRiskSignal,
    FulfillmentRiskSignal,
    NegotiationRiskSignal,
} from "./deal-intelligence.types";

/**
 * Maps a DealContext and optional shortage override to pure DealHealthCalculatorInput.
 */
export function mapDealContextToCalculatorInput(
    context: DealContext,
    options?: { hasShortage?: boolean },
): DealHealthCalculatorInput {
    let discountSignal: DiscountRiskSignal = "NONE";
    if (context.discount.status === "REJECTED") {
        discountSignal = "REJECTED";
    } else if (
        context.discount.status === "APPROVAL_REQUIRED" &&
        context.discount.approvalLevel === "FINANCE_OPERATIONS"
    ) {
        discountSignal = "FINANCE_APPROVAL_REQUIRED";
    } else if (
        context.discount.status === "APPROVAL_REQUIRED" &&
        context.discount.approvalLevel === "SALES_MANAGER"
    ) {
        discountSignal = "APPROVAL_REQUIRED";
    } else if (context.discount.status === "NEAR_LIMIT") {
        discountSignal = "NEAR_LIMIT";
    }

    let approvalSignal: ApprovalRiskSignal = "NONE";
    if (context.approval.status === ApprovalRequestStatus.REJECTED) {
        approvalSignal = "REJECTED";
    } else if (context.approval.status === ApprovalRequestStatus.PENDING) {
        if (
            context.approval.pendingLevel ===
            ApprovalStepLevel.FINANCE_OPERATIONS
        ) {
            approvalSignal = "PENDING_FINANCE_OPERATIONS";
        } else if (
            context.approval.pendingLevel === ApprovalStepLevel.SALES_MANAGER
        ) {
            approvalSignal = "PENDING_SALES_MANAGER";
        }
    }

    let negotiationSignal: NegotiationRiskSignal = "NONE";
    if (context.negotiation.pendingChangeRequests > 1) {
        negotiationSignal = "MULTIPLE_PENDING_CR";
    } else if (context.negotiation.pendingChangeRequests === 1) {
        negotiationSignal = "ONE_PENDING_CR";
    } else if (
        context.negotiation.status === NegotiationStatus.ACTIVE ||
        (context.negotiation.status as string) === "NEGOTIATING"
    ) {
        negotiationSignal = "ACTIVE";
    }

    let fulfillmentSignal: FulfillmentRiskSignal = "NONE";
    if (context.fulfillment.status) {
        if (
            context.fulfillment.status === FulfillmentStatus.PARTIALLY_ALLOCATED
        ) {
            if (
                options?.hasShortage ||
                (context.fulfillment.allocatedQuantity === 0 &&
                    context.fulfillment.requiredQuantity > 0)
            ) {
                fulfillmentSignal = "SHORTAGE";
            } else {
                fulfillmentSignal = "PARTIALLY_ALLOCATED";
            }
        } else if (context.fulfillment.status === FulfillmentStatus.PENDING) {
            fulfillmentSignal = "PENDING";
        }
    }

    let billingSignal: BillingRiskSignal = "NONE";
    if (context.billing.invoiceStatus === InvoiceStatus.PENDING) {
        billingSignal = "PENDING";
    } else if (context.billing.invoiceStatus === InvoiceStatus.PAID) {
        billingSignal = "PAID";
    }

    return {
        discountSignal,
        marginPercent: context.quotation.marginPercent,
        approvalSignal,
        negotiationSignal,
        fulfillmentSignal,
        billingSignal,
    };
}

export class DealContextService {
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
                where: { organizationId },
            }),
        ]);

        const categoryRuleMap = new Map<string, number>(
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
            salesManagerThreshold: approvalPolicy
                ? approvalPolicy.salesManagerThreshold.toNumber()
                : 10.0,
            financeOperationsThreshold: approvalPolicy
                ? approvalPolicy.financeOperationsThreshold.toNumber()
                : 20.0,
            hasPolicy: !!approvalPolicy,
        };
    }

    // ==========================================
    // Core Method: Gather DealContext & Inputs
    // ==========================================
    async getDealContextData(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<{ dealContext: DealContext; input: DealHealthCalculatorInput }> {
        // Scoped to organization
        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                organizationId: user.organizationId,
            },
            include: {
                customer: {
                    select: {
                        id: true,
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
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const latestRevision = quotation.revisions[0];
        if (!latestRevision) {
            throw new BadRequestError("Quotation has no revisions.");
        }

        // 1. Quotation & Revision Commercials
        const totalDiscountAmount = latestRevision.lineDiscountTotal.add(
            latestRevision.orderDiscount,
        );
        const blendedDiscountPercent = latestRevision.subtotal.gt(0)
            ? totalDiscountAmount
                  .mul(100)
                  .div(latestRevision.subtotal)
                  .toDecimalPlaces(2)
                  .toNumber()
            : 0;

        const quotationContext: DealContextQuotation = {
            id: quotation.id,
            quoteNumber: quotation.quoteNumber,
            status: quotation.status,
            revisionId: latestRevision.id,
            revisionNumber: latestRevision.revisionNumber,
            total: latestRevision.total.toNumber(),
            margin: latestRevision.margin.toNumber(),
            marginPercent: latestRevision.marginPercent.toNumber(),
            blendedDiscountPercent,
        };

        // 2. Customer
        const customerContext: DealContextCustomer = {
            id: quotation.customer.id,
            tier: quotation.customer.customerTier,
        };

        // 3. Discount Governance Evaluation & Multi-Line Aggregation
        let discountContext: DealContextDiscount = {
            status: "NONE",
            approvalLevel: "NONE",
            effectiveLimit: null,
        };

        if (latestRevision.lines.length > 0) {
            const categories = latestRevision.lines.map((l) => l.category);
            const governance = await this.resolveGovernanceRules(
                user.organizationId,
                quotation.customer.customerTier,
                categories,
            );

            const lineEvaluations: CanonicalLineEvaluationResult[] = [];
            const effectiveLimits: number[] = [];
            let anyLineNearLimit = false;

            for (const line of latestRevision.lines) {
                const categoryLimit =
                    governance.categoryRuleMap.get(line.category) ?? null;

                const normalizedRules: NormalizedDiscountGovernanceRules = {
                    customerTierLimit: governance.customerTierLimit,
                    categoryLimit,
                    salesManagerThreshold: governance.salesManagerThreshold,
                    financeOperationsThreshold:
                        governance.financeOperationsThreshold,
                };

                const lineDiscountVal = line.discountPercent.toNumber();

                // If governance rules exist, evaluate line
                if (governance.customerTierLimit !== null || categoryLimit !== null) {
                    const lineCtx: DiscountLineContext = {
                        lineId: line.lineNumber,
                        customerTier: quotation.customer.customerTier ?? CustomerTier.BRONZE,
                        productCategory: line.category,
                        discountPercent: lineDiscountVal,
                    };

                    const evaluation = evaluateLineDiscount(lineCtx, normalizedRules);
                    lineEvaluations.push(evaluation);

                    if (evaluation.effectiveLimit !== null) {
                        effectiveLimits.push(evaluation.effectiveLimit);

                        const remainingHeadroom =
                            evaluation.effectiveLimit - lineDiscountVal;
                        if (
                            evaluation.status === EvaluationStatus.WITHIN_LIMIT &&
                            lineDiscountVal > 0 &&
                            remainingHeadroom <= DISCOUNT_NEAR_LIMIT_HEADROOM_PERCENT
                        ) {
                            anyLineNearLimit = true;
                        }
                    }
                }
            }

            if (governance.customerTierLimit !== null) {
                effectiveLimits.push(governance.customerTierLimit);
            }

            const overallEffectiveLimit =
                effectiveLimits.length > 0 ? Math.min(...effectiveLimits) : null;

            // Check blended discount near tier limit
            const tierHeadroom =
                governance.customerTierLimit !== null
                    ? governance.customerTierLimit - blendedDiscountPercent
                    : null;
            const isBlendedNearLimit =
                tierHeadroom !== null &&
                tierHeadroom <= DISCOUNT_NEAR_LIMIT_HEADROOM_PERCENT &&
                blendedDiscountPercent > 0;

            const quotationEvaluation = evaluateQuotationGovernance({
                lineEvaluations,
                orderDiscountPercent:
                    latestRevision.orderDiscountPercent.toNumber(),
                customerTierLimit: governance.customerTierLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold:
                    governance.financeOperationsThreshold,
                subtotal: latestRevision.subtotal.toNumber(),
                lineDiscountTotal: latestRevision.lineDiscountTotal.toNumber(),
                orderDiscount: latestRevision.orderDiscount.toNumber(),
                marginPercent: latestRevision.marginPercent.toNumber(),
            });

            // Multi-line aggregation with strict precedence:
            // REJECTED (40) > FINANCE_APPROVAL_REQUIRED (25) > APPROVAL_REQUIRED (15) > NEAR_LIMIT (10) > NONE (0)
            const hasRejectedLine = lineEvaluations.some(
                (l) => l.status === EvaluationStatus.REJECTED,
            );
            const isQuotationRejected =
                quotationEvaluation.status === EvaluationStatus.REJECTED ||
                hasRejectedLine;

            const hasFinanceLine = lineEvaluations.some(
                (l) =>
                    l.approvalLevel === DiscountApprovalLevel.FINANCE_OPERATIONS,
            );
            const isFinanceRequired =
                quotationEvaluation.approvalLevel ===
                    DiscountApprovalLevel.FINANCE_OPERATIONS || hasFinanceLine;

            const hasSalesManagerLine = lineEvaluations.some(
                (l) =>
                    l.approvalLevel === DiscountApprovalLevel.SALES_MANAGER,
            );
            const isSalesManagerRequired =
                quotationEvaluation.approvalLevel ===
                    DiscountApprovalLevel.SALES_MANAGER || hasSalesManagerLine;

            const isNearLimit = anyLineNearLimit || isBlendedNearLimit;

            if (isQuotationRejected) {
                discountContext = {
                    status: "REJECTED",
                    approvalLevel: "NONE",
                    effectiveLimit: overallEffectiveLimit,
                };
            } else if (isFinanceRequired) {
                discountContext = {
                    status: "APPROVAL_REQUIRED",
                    approvalLevel: "FINANCE_OPERATIONS",
                    effectiveLimit: overallEffectiveLimit,
                };
            } else if (isSalesManagerRequired) {
                discountContext = {
                    status: "APPROVAL_REQUIRED",
                    approvalLevel: "SALES_MANAGER",
                    effectiveLimit: overallEffectiveLimit,
                };
            } else if (isNearLimit) {
                discountContext = {
                    status: "NEAR_LIMIT",
                    approvalLevel: "NONE",
                    effectiveLimit: overallEffectiveLimit,
                };
            } else {
                discountContext = {
                    status: "NONE",
                    approvalLevel: "NONE",
                    effectiveLimit: overallEffectiveLimit,
                };
            }
        }

        // 4. Approval Workflow State (current actionable step of authoritative revision)
        const approvalRequest = await prisma.approvalRequest.findFirst({
            where: {
                quotationId: quotation.id,
                revisionId: latestRevision.id,
            },
            orderBy: { createdAt: "desc" },
            include: {
                steps: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        let approvalContext: DealContextApproval = {
            status: null,
            pendingLevel: null,
        };

        if (approvalRequest) {
            approvalContext.status = approvalRequest.status;
            if (approvalRequest.status === "PENDING") {
                const pendingStep = approvalRequest.steps.find(
                    (s) => s.status === ApprovalStepStatus.PENDING,
                );
                approvalContext.pendingLevel = pendingStep ? pendingStep.level : null;
            }
        }

        // 5. Customer Negotiation & Change Request State
        const negotiation = await prisma.negotiation.findFirst({
            where: {
                quotationId: quotation.id,
            },
            orderBy: { createdAt: "desc" },
            include: {
                changeRequests: {
                    where: { status: ChangeRequestStatus.PENDING },
                },
            },
        });

        let negotiationContext: DealContextNegotiation = {
            status: null,
            pendingChangeRequests: 0,
        };

        if (negotiation) {
            negotiationContext = {
                status: negotiation.status,
                pendingChangeRequests: negotiation.changeRequests.length,
            };
        }

        // 6. Fulfillment & Allocation State (for authoritative revision)
        const fulfillment = await prisma.fulfillment.findFirst({
            where: {
                quotationId: quotation.id,
                revisionId: latestRevision.id,
            },
            orderBy: { createdAt: "desc" },
            include: {
                lines: true,
            },
        });

        let fulfillmentContext: DealContextFulfillment = {
            status: null,
            requiredQuantity: 0,
            allocatedQuantity: 0,
        };
        let hasShortage = false;

        if (fulfillment) {
            const requiredQuantity = fulfillment.lines.reduce(
                (sum, l) => sum + l.requiredQty,
                0,
            );
            const allocatedQuantity = fulfillment.lines.reduce(
                (sum, l) => sum + l.allocatedQty,
                0,
            );
            hasShortage = fulfillment.lines.some(
                (l) => l.allocatedQty === 0 && l.requiredQty > 0,
            );

            fulfillmentContext = {
                status: fulfillment.status,
                requiredQuantity,
                allocatedQuantity,
            };
        }

        // 7. Billing State (for authoritative revision)
        const [invoice, subscriptionCount] = await Promise.all([
            prisma.invoice.findFirst({
                where: {
                    quotationId: quotation.id,
                    revisionId: latestRevision.id,
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.subscription.count({
                where: {
                    quotationId: quotation.id,
                    revisionId: latestRevision.id,
                },
            }),
        ]);

        const billingContext: DealContextBilling = {
            invoiceStatus: invoice ? invoice.status : null,
            invoiceTotal: invoice ? invoice.total.toNumber() : 0,
            subscriptionCount,
        };

        const dealContext: DealContext = {
            quotation: quotationContext,
            customer: customerContext,
            discount: discountContext,
            approval: approvalContext,
            negotiation: negotiationContext,
            fulfillment: fulfillmentContext,
            billing: billingContext,
        };

        const input = mapDealContextToCalculatorInput(dealContext, {
            hasShortage,
        });

        return { dealContext, input };
    }

    // ==========================================
    // Public Method: Get DealContext read model
    // ==========================================
    async getDealContext(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<DealContext> {
        const { dealContext } = await this.getDealContextData(user, quotationId);
        return dealContext;
    }
}

export const dealContextService = new DealContextService();
