/**
 * AI Deal Copilot Types (V1)
 */

import { CustomerTier, QuotationStatus } from "@prisma/client";
import {
    CopilotEvidenceSource,
    CopilotIntentType,
} from "./copilot.constants";

export interface CopilotRequestInput {
    message: string;
}

export type CopilotIntent =
    | { type: typeof CopilotIntentType.DEAL_SUMMARY }
    | { type: typeof CopilotIntentType.DEAL_RISK }
    | { type: typeof CopilotIntentType.NEXT_ACTION }
    | { type: typeof CopilotIntentType.UPSELL }
    | {
          type: typeof CopilotIntentType.NEGOTIATION_ADVICE;
          negotiationMessage: string;
      }
    | { type: typeof CopilotIntentType.UNSUPPORTED };

export interface CopilotEvidence {
    source: CopilotEvidenceSource;
    fact: string;
}

export interface CopilotAction {
    label: string;
    description: string;
}

export interface CopilotResponse {
    intent: CopilotIntentType;
    answer: string;
    citations: CopilotEvidence[];
    actions?: CopilotAction[];
}

/**
 * Capability-Scoped Authoritative Facts (Allowlisted, Zero Internal IDs)
 */
export interface CopilotSummaryFacts {
    quoteNumber: string;
    status: QuotationStatus;
    revisionNumber: number;
    customerTier: CustomerTier | null;
    total: number;
    margin: number;
    marginPercent: number;
    blendedDiscountPercent: number;
    discountStatus: string;
    approvalLevel: string;
    approvalStatus: string;
    pendingApprovalLevel: string | null;
    negotiationStatus: string;
    pendingChangeRequests: number;
    fulfillmentStatus: string | null;
    invoiceStatus: string | null;
}

export interface CopilotRiskFacts {
    healthScore: number;
    healthStatus: string;
    summary: string;
    keyRisks: Array<{
        factor: string;
        severity: string;
        impact: number;
        message: string;
    }>;
    recommendedActions: string[];
}

export interface CopilotNextActionFacts {
    quoteNumber: string;
    status: QuotationStatus;
    pendingApprovalLevel: string | null;
    pendingChangeRequests: number;
    fulfillmentStatus: string | null;
    invoiceStatus: string | null;
    healthStatus: string;
    criticalFactors: Array<{
        factor: string;
        severity: string;
        message: string;
    }>;
    blockers: string[];
}

export interface CopilotUpsellFacts {
    summary: string;
    recommendations: Array<{
        productId: string;
        name: string;
        fit: string;
        reason: string;
    }>;
}

export interface CopilotNegotiationFacts {
    interpretationStatus: string;
    changes: Array<{
        lineNumber: number;
        productName: string;
        before: {
            quantity: number;
            discountPercent: number;
            lineTotal: number;
        };
        after: {
            quantity: number;
            discountPercent: number;
            lineTotal: number;
        };
    }>;
    before: {
        total: number;
        marginPercent: number;
        blendedDiscountPercent: number;
    } | null;
    after: {
        total: number;
        marginPercent: number;
        blendedDiscountPercent: number;
    } | null;
    governance: {
        status: string;
        approvalLevel: string;
        message: string | null;
    } | null;
}

export type CopilotCapabilityFacts =
    | { intent: "DEAL_SUMMARY"; data: CopilotSummaryFacts }
    | { intent: "DEAL_RISK"; data: CopilotRiskFacts }
    | { intent: "NEXT_ACTION"; data: CopilotNextActionFacts }
    | { intent: "UPSELL"; data: CopilotUpsellFacts }
    | { intent: "NEGOTIATION_ADVICE"; data: CopilotNegotiationFacts }
    | { intent: "UNSUPPORTED"; data: null };

export interface CopilotOptions {
    mockMode?: string;
}
