import {
    BillingInterval,
    InvoiceStatus,
    SubscriptionStatus,
} from "@prisma/client";

export interface GenerateBillingInput {
    quotationId: string;
}

export interface InvoiceLineResponse {
    id: string;
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
}

export interface PaymentResponse {
    id: string;
    invoiceId: string;
    amount: number;
    paidAt: string;
    reference: string | null;
    createdAt: string;
}

export interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    customerId: string;
    customerName: string;
    status: InvoiceStatus;
    subtotal: number;
    total: number;
    dueDate: string | null;
    paidAt: string | null;
    lines: InvoiceLineResponse[];
    payments: PaymentResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceSummaryResponse {
    id: string;
    invoiceNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    customerId: string;
    customerName: string;
    status: InvoiceStatus;
    subtotal: number;
    total: number;
    dueDate: string | null;
    paidAt: string | null;
    lineCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionLineResponse {
    id: string;
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
}

export interface SubscriptionResponse {
    id: string;
    subscriptionNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    customerId: string;
    customerName: string;
    status: SubscriptionStatus;
    billingInterval: BillingInterval;
    recurringAmount: number;
    startDate: string;
    nextBillingDate: string;
    lines: SubscriptionLineResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionSummaryResponse {
    id: string;
    subscriptionNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    customerId: string;
    customerName: string;
    status: SubscriptionStatus;
    billingInterval: BillingInterval;
    recurringAmount: number;
    startDate: string;
    nextBillingDate: string;
    lineCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface GenerateBillingResponse {
    invoice: InvoiceResponse | null;
    subscriptions: SubscriptionResponse[];
}

export interface BillingPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface InvoiceListResponse {
    invoices: InvoiceSummaryResponse[];
    pagination: BillingPaginationMeta;
}

export interface SubscriptionListResponse {
    subscriptions: SubscriptionSummaryResponse[];
    pagination: BillingPaginationMeta;
}

export interface ListInvoicesQuery {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    quotationId?: string;
}

export interface ListSubscriptionsQuery {
    page?: number;
    limit?: number;
    status?: SubscriptionStatus;
    billingInterval?: BillingInterval;
    quotationId?: string;
}
