/**
 * Negotiation Interpretation & Deterministic Preview Types (V1)
 *
 * Types for interpreting natural-language customer negotiation messages
 * into structured, strongly-typed commercial intents and deterministic commercial previews.
 * Completely read-only: no domain mutations or database persistence.
 */

import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type {
    CustomerTier,
    NegotiationStatus,
    QuotationRevisionStatus,
    QuotationStatus,
} from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

export const NegotiationInterpretationStatus = {
    INTERPRETED: "INTERPRETED",
    AMBIGUOUS: "AMBIGUOUS",
    UNSUPPORTED: "UNSUPPORTED",
} as const;
export type NegotiationInterpretationStatus =
    (typeof NegotiationInterpretationStatus)[keyof typeof NegotiationInterpretationStatus];

export const NegotiationChangeType = {
    LINE_DISCOUNT: "LINE_DISCOUNT",
    LINE_QUANTITY: "LINE_QUANTITY",
} as const;
export type NegotiationChangeType =
    (typeof NegotiationChangeType)[keyof typeof NegotiationChangeType];

export interface LineDiscountChange {
    type: "LINE_DISCOUNT";
    lineNumber: number;
    discountPercent: number;
}

export interface LineQuantityChange {
    type: "LINE_QUANTITY";
    lineNumber: number;
    quantity: number;
}

export type NegotiationChange = LineDiscountChange | LineQuantityChange;

export interface NegotiationIntent {
    changes: NegotiationChange[];
}

export interface NegotiationInterpretationResult {
    status: NegotiationInterpretationStatus;
    intent: NegotiationIntent | null;
}

/**
 * Allowlisted AI context:
 * Strips all internal database IDs (quotationId, customerId, revisionId, productId, variantId, orgId),
 * costs, margins, and PII. lineNumber is the only identifier used for line targeting.
 */
export interface AINegotiationQuotationContext {
    quoteNumber: string;
    revisionNumber: number;
}

export interface AINegotiationLineContext {
    lineNumber: number;
    name: string;
    sku: string | null;
    category: string;
    quantity: number;
    currentDiscountPercent: number;
    unitPrice: number;
}

export interface AINegotiationContext {
    quotation: AINegotiationQuotationContext;
    lines: AINegotiationLineContext[];
    customerMessage: string;
}

/**
 * Deterministic Commercial Preview Types
 */
export interface NegotiationGovernanceSummary {
    status: EvaluationStatus;
    approvalLevel: DiscountApprovalLevel;
    message: string | null;
}

export interface NegotiationCommercialSummary {
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscount: number;
    total: number;
    margin: number;
    marginPercent: number;
    blendedDiscountPercent: number;
    governance: NegotiationGovernanceSummary;
}

export interface NegotiationLineCommercialState {
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
}

export interface NegotiationLineChangePreview {
    lineNumber: number;
    productName: string;
    sku: string | null;
    before: NegotiationLineCommercialState;
    after: NegotiationLineCommercialState;
}

export interface NegotiationPreviewResult {
    status: NegotiationInterpretationStatus;
    intent: NegotiationIntent | null;
    commercial: NegotiationCommercialSummary | null;
    changes: NegotiationLineChangePreview[];
    before: NegotiationCommercialSummary | null;
    after: NegotiationCommercialSummary | null;
}

/**
 * Authoritative loaded quotation snapshot for negotiation interpretation & deterministic preview.
 */
export interface ResolvedNegotiationQuotationLine {
    id: string;
    lineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    category: string;
    quantity: number;
    unitPrice: Decimal;
    unitCost: Decimal;
    discountPercent: Decimal;
}

export interface ResolvedNegotiationQuotationRevision {
    id: string;
    revisionNumber: number;
    status: QuotationRevisionStatus;
    orderDiscountPercent: Decimal;
    lines: ResolvedNegotiationQuotationLine[];
}

export interface ResolvedNegotiationQuotation {
    id: string;
    quoteNumber: string;
    status: QuotationStatus;
    customer: {
        id: string;
        name: string;
        customerTier: CustomerTier | null;
    } | null;
    revisions: ResolvedNegotiationQuotationRevision[];
}

/**
 * Deterministic Negotiation Execution Types (V1)
 */
export interface ExecuteNegotiationIntentInput {
    sourceRevisionId: string;
    sourceRevisionNumber: number;
    changes: NegotiationChange[];
}

export interface NegotiationExecutionChangeItem {
    lineNumber: number;
    name: string;
    changeType: string;
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
}

export interface NegotiationExecutionCommercialSummary {
    status: EvaluationStatus;
    approvalLevel: DiscountApprovalLevel;
    effectiveLimit: number | null;
}

export interface NegotiationExecutionApprovalSummary {
    required: boolean;
    requestId: string | null;
    level: DiscountApprovalLevel | null;
}

export interface NegotiationExecutionResult {
    quotation: {
        id: string;
        quoteNumber: string;
        status: QuotationStatus;
    };
    revision: {
        id: string;
        revisionNumber: number;
        status: QuotationRevisionStatus;
    };
    negotiation: {
        id: string;
        status: NegotiationStatus;
    };
    changes: NegotiationExecutionChangeItem[];
    commercial: NegotiationExecutionCommercialSummary;
    approval: NegotiationExecutionApprovalSummary;
}
