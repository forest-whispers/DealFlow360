/**
 * AI Deal Copilot Main Service (V1)
 *
 * Orchestrates conversational deal assistance for DealFlow360:
 * 1. Dual-authorization with anti-enumeration (404 Not Found on mismatch).
 * 2. Stage 1: Classifies natural-language message into strictly bounded CopilotIntent.
 * 3. Deterministic Router: Dispatches intent to existing domain services.
 * 4. Stage 2: Formats capability-scoped context and synthesizes grounded response.
 *
 * Invariants:
 * - Strictly read-only; zero database mutations.
 * - Reuses existing domain services; no parallel algorithms.
 * - Post-processed citation grounding and anti-mutation claim assertions.
 */

import { prisma } from "@/server/shared/db/prisma";
import { NotFoundError } from "@/server/shared/errors/errors";
import { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    DealIntelligenceService,
    dealIntelligenceService,
} from "@/server/modules/deal-intelligence/deal-intelligence.service";
import {
    UpsellService,
    upsellService,
} from "@/server/modules/ai/upsell/upsell.service";
import {
    NegotiationPreviewService,
    negotiationPreviewService,
} from "@/server/modules/ai/negotiation/negotiation.preview.service";
import {
    CopilotInterpreterService,
    copilotInterpreterService,
} from "./copilot.interpreter";
import {
    CopilotSynthesizerService,
    copilotSynthesizerService,
} from "./copilot.synthesizer";
import {
    CopilotEvidenceSource,
    CopilotIntentType,
} from "./copilot.constants";
import type {
    CopilotIntent,
    CopilotNextActionFacts,
    CopilotNegotiationFacts,
    CopilotOptions,
    CopilotRequestInput,
    CopilotResponse,
    CopilotRiskFacts,
    CopilotSummaryFacts,
    CopilotUpsellFacts,
} from "./copilot.types";
import {
    formatNextActionFacts,
    formatNegotiationFacts,
    formatRiskFacts,
    formatSummaryFacts,
    formatUpsellFacts,
} from "./copilot.context";

export class CopilotService {
    constructor(
        private readonly interpreter: CopilotInterpreterService = copilotInterpreterService,
        private readonly synthesizer: CopilotSynthesizerService = copilotSynthesizerService,
        private readonly dealIntelligence: DealIntelligenceService = dealIntelligenceService,
        private readonly upsell: UpsellService = upsellService,
        private readonly negotiationPreview: NegotiationPreviewService = negotiationPreviewService,
    ) {}

    /**
     * Processes a user question about a deal in a strictly read-only conversational workflow.
     */
    async processMessage(
        user: AuthenticatedUser,
        quotationId: string,
        input: CopilotRequestInput,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        // 1. Authorize user with anti-enumeration (404 Not Found)
        await this.authorizeUser(user, quotationId);

        // 2. Stage 1: Interpret User Intent
        const intent = await this.interpreter.interpretIntent(input.message, options);

        // 3. Deterministic Routing
        switch (intent.type) {
            case CopilotIntentType.DEAL_SUMMARY:
                return this.handleDealSummary(user, quotationId, input.message, intent, options);

            case CopilotIntentType.DEAL_RISK:
                return this.handleDealRisk(user, quotationId, input.message, intent, options);

            case CopilotIntentType.NEXT_ACTION:
                return this.handleNextAction(user, quotationId, input.message, intent, options);

            case CopilotIntentType.UPSELL:
                return this.handleUpsell(user, quotationId, input.message, intent, options);

            case CopilotIntentType.NEGOTIATION_ADVICE:
                return this.handleNegotiationAdvice(user, quotationId, input.message, intent, options);

            case CopilotIntentType.UNSUPPORTED:
            default:
                return {
                    intent: CopilotIntentType.UNSUPPORTED,
                    answer: "I can only assist with questions about this deal, including deal summaries, risk explanations, recommended next actions, upsell suggestions, and discount negotiation advice.",
                    citations: [],
                    actions: [],
                };
        }
    }

    /**
     * Dual authorization check enforcing organization scoping and customer ownership.
     * Always throws 404 NotFoundError on unauthorized access to prevent ID enumeration.
     */
    async authorizeUser(user: AuthenticatedUser, quotationId: string): Promise<void> {
        const quotationWhere: {
            id: string;
            organizationId: string;
            customerId?: string;
        } = {
            id: quotationId,
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            quotationWhere.customerId = user.id;
        }

        const quotation = await prisma.quotation.findFirst({
            where: quotationWhere,
            select: { id: true },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }
    }

    /**
     * Handles DEAL_SUMMARY intent via dealIntelligenceService.
     */
    private async handleDealSummary(
        user: AuthenticatedUser,
        quotationId: string,
        userMessage: string,
        intent: CopilotIntent,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        const { context } = await this.dealIntelligence.getDealIntelligence(user, quotationId);

        const facts: CopilotSummaryFacts = {
            quoteNumber: context.quotation.quoteNumber,
            status: context.quotation.status,
            revisionNumber: context.quotation.revisionNumber,
            customerTier: context.customer.tier ?? null,
            total: context.quotation.total,
            margin: context.quotation.margin,
            marginPercent: context.quotation.marginPercent,
            blendedDiscountPercent: context.quotation.blendedDiscountPercent,
            discountStatus: context.discount.status ?? "NONE",
            approvalLevel: context.discount.approvalLevel ?? "NONE",
            approvalStatus: context.approval.status ?? "NONE",
            pendingApprovalLevel: context.approval.pendingLevel ?? null,
            negotiationStatus: context.negotiation.status ?? "NONE",
            pendingChangeRequests: context.negotiation.pendingChangeRequests,
            fulfillmentStatus: context.fulfillment?.status ?? null,
            invoiceStatus: context.billing?.invoiceStatus ?? null,
        };

        const { text, verbatimFacts } = formatSummaryFacts(facts);

        return this.synthesizer.synthesize(
            userMessage,
            intent,
            text,
            verbatimFacts,
            CopilotEvidenceSource.DEAL_CONTEXT,
            options,
        );
    }

    /**
     * Handles DEAL_RISK intent via deterministic deal health evaluation.
     */
    private async handleDealRisk(
        user: AuthenticatedUser,
        quotationId: string,
        userMessage: string,
        intent: CopilotIntent,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        const { health } = await this.dealIntelligence.getDealIntelligence(user, quotationId);

        // Derive deterministic recommended actions based on authoritative risk factors
        const recommendedActions: string[] = [];
        for (const factor of health.factors) {
            switch (factor.type) {
                case "DISCOUNT":
                    recommendedActions.push("Review line-item discounts against governance approval tiers.");
                    break;
                case "MARGIN":
                    recommendedActions.push("Adjust pricing or item costs to improve overall deal margin.");
                    break;
                case "FULFILLMENT":
                    recommendedActions.push("Check inventory availability across alternative warehouses.");
                    break;
                case "BILLING":
                    recommendedActions.push("Review customer payment terms and follow up on outstanding invoices.");
                    break;
                case "NEGOTIATION":
                    recommendedActions.push("Review and respond to pending customer negotiation change requests.");
                    break;
                case "APPROVAL":
                    recommendedActions.push("Follow up with designated approvers to unblock the approval gate.");
                    break;
            }
        }

        if (recommendedActions.length === 0) {
            recommendedActions.push("Proceed with standard quotation lifecycle steps.");
        }

        const summary = health.factors.length > 0
            ? `Deal health is evaluated as ${health.status} with an overall score of ${health.score}/100 and ${health.factors.length} active risk factor(s).`
            : `Deal is evaluated as healthy with a score of ${health.score}/100 and no identified risk factors.`;

        const facts: CopilotRiskFacts = {
            healthScore: health.score,
            healthStatus: health.status,
            summary,
            keyRisks: health.factors.map((f) => ({
                factor: f.type,
                severity: f.severity,
                impact: f.impact,
                message: f.message,
            })),
            recommendedActions,
        };

        const { text, verbatimFacts } = formatRiskFacts(facts);

        return this.synthesizer.synthesize(
            userMessage,
            intent,
            text,
            verbatimFacts,
            CopilotEvidenceSource.RISK_EXPLANATION,
            options,
        );
    }

    /**
     * Handles NEXT_ACTION intent by extracting blockers from deal context & health.
     */
    private async handleNextAction(
        user: AuthenticatedUser,
        quotationId: string,
        userMessage: string,
        intent: CopilotIntent,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        const { context, health } = await this.dealIntelligence.getDealIntelligence(user, quotationId);

        // Deterministically identify active workflow blockers
        const blockers: string[] = [];
        if (context.approval.status === "PENDING" && context.approval.pendingLevel) {
            blockers.push(`Quotation is awaiting approval from ${context.approval.pendingLevel}`);
        }
        if (context.discount.status === "REJECTED") {
            blockers.push("Discount exceeds allowable limit and is REJECTED by governance policy");
        } else if (
            context.discount.status === "APPROVAL_REQUIRED" &&
            context.approval.status !== "APPROVED"
        ) {
            blockers.push(`Requires ${context.discount.approvalLevel} approval before deal can be confirmed`);
        }
        if (context.negotiation.pendingChangeRequests > 0) {
            blockers.push(`${context.negotiation.pendingChangeRequests} customer change request(s) pending review`);
        }
        if (context.fulfillment?.status === "PENDING" || context.fulfillment?.status === "PARTIALLY_ALLOCATED") {
            blockers.push(`Warehouse fulfillment status is ${context.fulfillment.status}`);
        }
        if (context.billing?.invoiceStatus === "PENDING") {
            blockers.push("Quotation invoice is pending payment");
        }

        if (blockers.length === 0) {
            blockers.push("No active blockers detected. The deal is ready to proceed to the next lifecycle stage.");
        }

        const criticalFactors = health.factors
            .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
            .map((f) => ({
                factor: f.type,
                severity: f.severity,
                message: f.message,
            }));

        const facts: CopilotNextActionFacts = {
            quoteNumber: context.quotation.quoteNumber,
            status: context.quotation.status,
            pendingApprovalLevel: context.approval.pendingLevel ?? null,
            pendingChangeRequests: context.negotiation.pendingChangeRequests,
            fulfillmentStatus: context.fulfillment?.status ?? null,
            invoiceStatus: context.billing?.invoiceStatus ?? null,
            healthStatus: health.status,
            criticalFactors,
            blockers,
        };

        const { text, verbatimFacts } = formatNextActionFacts(facts);

        return this.synthesizer.synthesize(
            userMessage,
            intent,
            text,
            verbatimFacts,
            CopilotEvidenceSource.DEAL_CONTEXT,
            options,
        );
    }

    /**
     * Handles UPSELL intent via upsellService.
     */
    private async handleUpsell(
        user: AuthenticatedUser,
        quotationId: string,
        userMessage: string,
        intent: CopilotIntent,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        const upsellResult = await this.upsell.getUpsellRecommendations(
            user,
            quotationId,
            options ? { mockMode: options.mockMode } : undefined,
        );

        // Fetch product names for recommendation product IDs to ensure zero raw IDs in facts
        const productIds = upsellResult.recommendations.map((r) => r.productId);
        const products: Array<{ id: string; name: string }> = productIds.length > 0
            ? await prisma.product.findMany({
                  where: { id: { in: productIds } },
                  select: { id: true, name: true },
              })
            : [];
        const productMap = new Map<string, string>(products.map((p) => [p.id, p.name]));

        const facts: CopilotUpsellFacts = {
            summary: upsellResult.summary,
            recommendations: upsellResult.recommendations.map((r) => ({
                productId: r.productId,
                name: productMap.get(r.productId) ?? "Complementary Product",
                fit: r.fit,
                reason: r.reason,
            })),
        };

        const { text, verbatimFacts } = formatUpsellFacts(facts);

        return this.synthesizer.synthesize(
            userMessage,
            intent,
            text,
            verbatimFacts,
            CopilotEvidenceSource.UPSELL,
            options,
        );
    }

    /**
     * Handles NEGOTIATION_ADVICE intent via negotiationPreviewService.
     */
    private async handleNegotiationAdvice(
        user: AuthenticatedUser,
        quotationId: string,
        userMessage: string,
        intent: CopilotIntent,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        const negotiationMessage =
            intent.type === CopilotIntentType.NEGOTIATION_ADVICE && intent.negotiationMessage
                ? intent.negotiationMessage
                : userMessage;

        const previewResult = await this.negotiationPreview.previewNegotiationMessage(
            user,
            quotationId,
            { message: negotiationMessage },
            options ? { mockMode: options.mockMode } : undefined,
        );

        const facts: CopilotNegotiationFacts = {
            interpretationStatus: previewResult.status,
            governance: previewResult.commercial
                ? {
                      status: previewResult.commercial.governance.status,
                      approvalLevel: previewResult.commercial.governance.approvalLevel,
                      message: previewResult.commercial.governance.message,
                  }
                : null,
            before: previewResult.before
                ? {
                      total: previewResult.before.total,
                      marginPercent: previewResult.before.marginPercent,
                      blendedDiscountPercent: previewResult.before.blendedDiscountPercent,
                  }
                : null,
            after: previewResult.after
                ? {
                      total: previewResult.after.total,
                      marginPercent: previewResult.after.marginPercent,
                      blendedDiscountPercent: previewResult.after.blendedDiscountPercent,
                  }
                : null,
            changes: previewResult.changes.map((ch) => ({
                lineNumber: ch.lineNumber,
                productName: ch.productName,
                before: {
                    quantity: ch.before.quantity,
                    discountPercent: ch.before.discountPercent,
                    lineTotal: ch.before.lineTotal,
                },
                after: {
                    quantity: ch.after.quantity,
                    discountPercent: ch.after.discountPercent,
                    lineTotal: ch.after.lineTotal,
                },
            })),
        };

        const { text, verbatimFacts } = formatNegotiationFacts(facts);

        return this.synthesizer.synthesize(
            userMessage,
            intent,
            text,
            verbatimFacts,
            CopilotEvidenceSource.NEGOTIATION_PREVIEW,
            options,
        );
    }
}

export const copilotService = new CopilotService();
