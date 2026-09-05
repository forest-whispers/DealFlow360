import type {
    BillingInterval,
    BillingType,
    CustomerTier,
    QuotationStatus,
} from "@prisma/client";

export const UpsellFit = {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
} as const;
export type UpsellFit = (typeof UpsellFit)[keyof typeof UpsellFit];

export interface ProductRecommendation {
    productId: string;
    fit: UpsellFit;
    reason: string;
}

export interface UpsellRecommendationResult {
    summary: string;
    recommendations: ProductRecommendation[];
}

export interface AIUpsellQuotationContext {
    status: QuotationStatus;
    total: number;
    marginPercent: number;
    blendedDiscountPercent: number;
}

export interface AIUpsellCustomerContext {
    tier: CustomerTier | null;
}

export interface AIUpsellCurrentProduct {
    name: string;
    category: string;
    billingType: BillingType;
}

export interface AIUpsellCandidate {
    productId: string;
    name: string;
    category: string;
    description: string | null;
    billingType: BillingType;
    billingInterval: BillingInterval | null;
}

export interface AIUpsellContext {
    customer: AIUpsellCustomerContext;
    quotation: AIUpsellQuotationContext;
    currentProducts: AIUpsellCurrentProduct[];
    candidates: AIUpsellCandidate[];
}
