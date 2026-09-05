import {
    ChangeRequestStatus,
    NegotiationMessageAuthorType,
    NegotiationStatus,
    QuotationRevisionStatus,
    QuotationStatus,
} from "@prisma/client";

export interface PortalQuotationLineResponse {
    lineNumber: number;
    productId: string;
    name: string;
    sku: string | null;
    category: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
}

export interface PortalQuotationSummaryResponse {
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscount: number;
    total: number;
}

export interface PortalQuotationRevisionResponse {
    id: string;
    revisionNumber: number;
    status: QuotationRevisionStatus;
    orderDiscountPercent: number;
    summary: PortalQuotationSummaryResponse;
    lines: PortalQuotationLineResponse[];
}

export interface PortalQuotationDetailResponse {
    id: string;
    quoteNumber: string;
    status: QuotationStatus;
    createdAt: string;
    updatedAt: string;
    revision: PortalQuotationRevisionResponse;
}

export interface PortalQuotationCardResponse {
    id: string;
    quoteNumber: string;
    status: QuotationStatus;
    total: number;
    revisionNumber: number;
    createdAt: string;
    updatedAt: string;
}

export interface PortalQuotationListResponse {
    quotations: PortalQuotationCardResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PortalNegotiationMessageResponse {
    id: string;
    authorType: NegotiationMessageAuthorType;
    authorName: string;
    message: string;
    createdAt: string;
}

export interface PortalChangeRequestResponse {
    id: string;
    lineNumber: number | null;
    quantity: number | null;
    discountPercent: number | null;
    orderDiscountPercent: number | null;
    message: string | null;
    status: ChangeRequestStatus;
    createdAt: string;
}

export interface PortalNegotiationHistoryResponse {
    quotationId: string;
    status: NegotiationStatus | "NO_NEGOTIATION";
    messages: PortalNegotiationMessageResponse[];
    changeRequests: PortalChangeRequestResponse[];
}

export interface CreateNegotiationMessageInput {
    message: string;
}

export interface CreateChangeRequestInput {
    lineNumber?: number;
    quantity?: number;
    discountPercent?: number;
    orderDiscountPercent?: number;
    message?: string;
}

export interface ListCustomerQuotationsQuery {
    page?: number;
    limit?: number;
}
