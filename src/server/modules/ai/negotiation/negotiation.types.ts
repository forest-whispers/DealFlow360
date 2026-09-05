/**
 * Negotiation Interpretation Types (V1)
 *
 * Types for interpreting natural-language customer negotiation messages
 * into structured, strongly-typed commercial intents.
 * Completely read-only: no domain mutations or database persistence.
 */

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
