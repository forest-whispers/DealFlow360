import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { dealIntelligenceService } from "@/server/modules/deal-intelligence/deal-intelligence.service";
import type {
    DealContext,
    DealHealthResult,
} from "@/server/modules/deal-intelligence/deal-intelligence.types";
import type { AIDealContext } from "./ai.types";

/**
 * Pure transformation function that projects authoritative DealContext and DealHealthResult
 * into a compact, allowlisted AIDealContext.
 *
 * Guarantees:
 * - Zero Prisma or database IDs (quotationId, customerId, revisionId are stripped).
 * - Zero PII, credentials, passwords, or tenant metadata.
 * - All numbers are plain JavaScript primitives (never Prisma Decimal).
 */
export function buildAIDealContext(
    dealContext: DealContext,
    healthResult: DealHealthResult
): AIDealContext {
    return {
        deal: {
            quoteNumber: dealContext.quotation.quoteNumber,
            status: dealContext.quotation.status,
            total: Number(dealContext.quotation.total),
            marginPercent: Number(dealContext.quotation.marginPercent),
            blendedDiscountPercent: Number(dealContext.quotation.blendedDiscountPercent),
        },
        customer: {
            tier: dealContext.customer.tier,
        },
        discount: {
            status: dealContext.discount.status,
            approvalLevel: dealContext.discount.approvalLevel,
            effectiveLimit:
                dealContext.discount.effectiveLimit !== null
                    ? Number(dealContext.discount.effectiveLimit)
                    : null,
        },
        approval: {
            status: dealContext.approval.status,
            pendingLevel: dealContext.approval.pendingLevel,
        },
        negotiation: {
            status: dealContext.negotiation.status,
            pendingChangeRequests: Number(dealContext.negotiation.pendingChangeRequests),
        },
        fulfillment: {
            status: dealContext.fulfillment.status,
            requiredQuantity: Number(dealContext.fulfillment.requiredQuantity),
            allocatedQuantity: Number(dealContext.fulfillment.allocatedQuantity),
        },
        billing: {
            invoiceStatus: dealContext.billing.invoiceStatus,
            invoiceTotal: Number(dealContext.billing.invoiceTotal),
            subscriptionCount: Number(dealContext.billing.subscriptionCount),
        },
        health: {
            score: Number(healthResult.score),
            status: healthResult.status,
            factors: healthResult.factors.map((f) => ({
                type: f.type,
                severity: f.severity,
                impact: Number(f.impact),
                message: f.message,
            })),
        },
    };
}

/**
 * Pure deterministic formatter that converts an AIDealContext into a compact text block
 * suitable for inclusion in LLM prompts.
 */
export function formatDealContextForPrompt(context: AIDealContext): string {
    const lines: string[] = [
        "=== DEAL CONTEXT ===",
        `Quote: ${context.deal.quoteNumber} | Status: ${context.deal.status}`,
        `Total: $${context.deal.total.toFixed(2)} | Margin: ${context.deal.marginPercent}% | Discount: ${context.deal.blendedDiscountPercent}%`,
        `Customer Tier: ${context.customer.tier ?? "N/A"}`,
        `Discount Status: ${context.discount.status ?? "None"} | Approval Level: ${context.discount.approvalLevel ?? "None"} | Limit: ${context.discount.effectiveLimit !== null ? `${context.discount.effectiveLimit}%` : "None"}`,
        `Approval Status: ${context.approval.status ?? "None"} | Pending Level: ${context.approval.pendingLevel ?? "None"}`,
        `Negotiation Status: ${context.negotiation.status ?? "None"} | Pending Change Requests: ${context.negotiation.pendingChangeRequests}`,
        `Fulfillment Status: ${context.fulfillment.status ?? "None"} | Required Qty: ${context.fulfillment.requiredQuantity} | Allocated Qty: ${context.fulfillment.allocatedQuantity}`,
        `Billing Invoice Status: ${context.billing.invoiceStatus ?? "None"} | Invoice Total: $${context.billing.invoiceTotal.toFixed(2)} | Subscriptions: ${context.billing.subscriptionCount}`,
        `Deal Health: Score ${context.health.score}/100 (${context.health.status})`,
    ];

    if (context.health.factors.length > 0) {
        lines.push("Risk Factors:");
        for (const factor of context.health.factors) {
            lines.push(` - [${factor.severity}] ${factor.type} (-${factor.impact} pts): ${factor.message}`);
        }
    } else {
        lines.push("Risk Factors: None");
    }

    return lines.join("\n");
}

/**
 * AI context orchestration service that retrieves authoritative deal context
 * and builds allowlisted AIDealContext for callers.
 */
export class AIContextService {
    async getAIDealContext(
        user: AuthenticatedUser,
        quotationId: string
    ): Promise<AIDealContext> {
        const [dealContext, healthResult] = await Promise.all([
            dealIntelligenceService.getDealContext(user, quotationId),
            dealIntelligenceService.getDealHealth(user, quotationId),
        ]);

        return buildAIDealContext(dealContext, healthResult);
    }
}

export const aiContextService = new AIContextService();
