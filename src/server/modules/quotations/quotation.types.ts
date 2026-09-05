import { CustomerTier, QuotationRevisionStatus, QuotationStatus } from "@prisma/client";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type { CanonicalLineEvaluationResult } from "@/server/modules/discount-governance/discount-governance.types";

export interface CanonicalQuotationCustomer {
    id: string;
    name: string;
    customerTier: CustomerTier | null;
}

export interface QuotationLineResponse {
    lineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    category: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    discountPercent: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
    margin: number;
    marginPercent: number;
    evaluation?: CanonicalLineEvaluationResult;
}

export interface QuotationSummaryResponse {
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscount: number;
    total: number;
    margin: number;
    marginPercent: number;
}

export interface QuotationEvaluationResponse {
    status: EvaluationStatus;
    approvalLevel: DiscountApprovalLevel;
    blendedRiskScore: number;
    message: string | null;
}

export interface QuotationRevisionResponse {
    id: string;
    revisionNumber: number;
    status: QuotationRevisionStatus;
    lines: QuotationLineResponse[];
    orderDiscountPercent: number;
    summary: QuotationSummaryResponse;
    evaluation?: QuotationEvaluationResponse;
}

export interface CanonicalQuotationResponse {
    id: string;
    quoteNumber: string;
    customer: CanonicalQuotationCustomer;
    status: QuotationStatus;
    revision: QuotationRevisionResponse;
}

export interface QuotationCardResponse {
    id: string;
    quoteNumber: string;
    customer: {
        id: string;
        name: string;
    };
    status: QuotationStatus;
    total: number;
    updatedAt: string;
    createdAt: string;
}

export interface QuotationListResponse {
    quotations: QuotationCardResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface LinePreviewResponse {
    lineId: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    category: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    discountPercent: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
    margin: number;
    marginPercent: number;
}

export interface RecalculateLineResponse {
    line: QuotationLineResponse;
    evaluation: CanonicalLineEvaluationResult;
}

export interface SubmitQuotationResponse {
    status: QuotationStatus;
    approvalLevel: DiscountApprovalLevel;
    blendedRiskScore: number;
    lines: CanonicalLineEvaluationResult[];
    approvalRequestId?: string;
}

export interface CreateQuotationInput {
    customerId: string;
}

export interface DraftLineInput {
    lineNumber: number;
    productId: string;
    variantId?: string | null;
    quantity: number;
    discountPercent: number;
}

export interface SaveDraftInput {
    lines: DraftLineInput[];
    orderDiscountPercent: number;
}

export interface LinePreviewInput {
    lineId: number;
    productId: string;
    variantId?: string | null;
    quantity: number;
    discountPercent: number;
}

export interface RecalculateLineInput {
    quantity: number;
    discountPercent: number;
}

export interface ListQuotationsQuery {
    page?: number;
    limit?: number;
    status?: QuotationStatus;
    customerId?: string;
    search?: string;
}
