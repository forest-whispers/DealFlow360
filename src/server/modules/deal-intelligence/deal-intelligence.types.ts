import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    CustomerTier,
    FulfillmentStatus,
    InvoiceStatus,
    NegotiationStatus,
    QuotationStatus,
} from "@prisma/client";
import {
    DealHealthStatus,
    DealRiskFactorType,
    DealRiskSeverity,
} from "./deal-intelligence.constants";

export { DealHealthStatus, DealRiskFactorType, DealRiskSeverity };

export interface DealRiskFactor {
    type: DealRiskFactorType;
    severity: DealRiskSeverity;
    impact: number;
    message: string;
}

export interface DealHealthResult {
    score: number;
    status: DealHealthStatus;
    factors: DealRiskFactor[];
}

export interface DealContextQuotation {
    id: string;
    quoteNumber: string;
    status: QuotationStatus;
    revisionId: string;
    revisionNumber: number;
    total: number;
    margin: number;
    marginPercent: number;
    blendedDiscountPercent: number;
}

export interface DealContextCustomer {
    id: string;
    tier: CustomerTier | null;
}

export interface DealContextDiscount {
    status: string | null;
    approvalLevel: string | null;
    effectiveLimit: number | null;
}

export interface DealContextApproval {
    status: ApprovalRequestStatus | null;
    pendingLevel: ApprovalStepLevel | null;
}

export interface DealContextNegotiation {
    status: NegotiationStatus | null;
    pendingChangeRequests: number;
}

export interface DealContextFulfillment {
    status: FulfillmentStatus | null;
    requiredQuantity: number;
    allocatedQuantity: number;
}

export interface DealContextBilling {
    invoiceStatus: InvoiceStatus | null;
    invoiceTotal: number;
    subscriptionCount: number;
}

export interface DealContext {
    quotation: DealContextQuotation;
    customer: DealContextCustomer;
    discount: DealContextDiscount;
    approval: DealContextApproval;
    negotiation: DealContextNegotiation;
    fulfillment: DealContextFulfillment;
    billing: DealContextBilling;
}

export type DiscountRiskSignal =
    | "NONE"
    | "NEAR_LIMIT"
    | "APPROVAL_REQUIRED"
    | "FINANCE_APPROVAL_REQUIRED"
    | "REJECTED";

export type ApprovalRiskSignal =
    | "NONE"
    | "PENDING_SALES_MANAGER"
    | "PENDING_FINANCE_OPERATIONS"
    | "REJECTED";

export type NegotiationRiskSignal =
    | "NONE"
    | "ACTIVE"
    | "ONE_PENDING_CR"
    | "MULTIPLE_PENDING_CR";

export type FulfillmentRiskSignal =
    | "NONE"
    | "PENDING"
    | "PARTIALLY_ALLOCATED"
    | "SHORTAGE"
    | "ALLOCATED"
    | "FULFILLED";

export type BillingRiskSignal = "NONE" | "PAID" | "PENDING";

export interface DealHealthCalculatorInput {
    discountSignal: DiscountRiskSignal;
    marginPercent: number;
    approvalSignal: ApprovalRiskSignal;
    negotiationSignal: NegotiationRiskSignal;
    fulfillmentSignal: FulfillmentRiskSignal;
    billingSignal: BillingRiskSignal;
}
