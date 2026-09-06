import { CustomerTier, QuotationStatus } from "@prisma/client";

export interface DashboardSummaryMetrics {
    activeQuotationsCount: number;
    activeQuotationsValue: number;
    pendingApprovalsCount: number;
    underNegotiationCount: number;
    confirmedDealsCount: number;
    outstandingBillingAmount: number;
    outstandingInvoicesCount: number;
    blendedMarginPercent: number;
    totalAllocatedUnits: number;
}

export interface PipelineStageMetric {
    status: QuotationStatus;
    label: string;
    count: number;
    totalValue: number;
}

export interface ApprovalWorkloadItem {
    level: "SALES_MANAGER" | "FINANCE_OPERATIONS";
    label: string;
    pendingCount: number;
}

export interface NegotiationWorkloadSummary {
    underNegotiationCount: number;
    pendingChangeRequestsCount: number;
    activeNegotiations: Array<{
        quotationId: string;
        quoteNumber: string;
        customerName: string;
        customerTier: CustomerTier | null;
        total: number;
        pendingChangeRequests: number;
        updatedAt: string;
    }>;
}

export interface FulfillmentOperationalSummary {
    pendingCount: number;
    partiallyAllocatedCount: number;
    allocatedCount: number;
    inProgressCount: number;
    fulfilledCount: number;
    totalRequiredQty: number;
    totalAllocatedQty: number;
}

export interface BillingOverviewSummary {
    pendingInvoicesCount: number;
    paidInvoicesCount: number;
    outstandingAmount: number;
    paidAmount: number;
    activeSubscriptionsCount: number;
    recurringMonthlyRevenue: number;
}

export interface DealHealthDistributionSummary {
    healthy: number;
    watch: number;
    atRisk: number;
    critical: number;
}

export interface RecentActivityItem {
    id: string;
    type: "QUOTATION" | "APPROVAL" | "NEGOTIATION" | "FULFILLMENT" | "BILLING" | "PAYMENT";
    title: string;
    description: string;
    timestamp: string;
    referenceNumber?: string;
    linkUrl?: string;
}

export interface DashboardDataResponse {
    summary: DashboardSummaryMetrics;
    pipeline: PipelineStageMetric[];
    approvalWorkload: ApprovalWorkloadItem[];
    negotiationWorkload: NegotiationWorkloadSummary;
    fulfillment: FulfillmentOperationalSummary;
    billing: BillingOverviewSummary;
    dealHealthDistribution: DealHealthDistributionSummary;
    recentActivities: RecentActivityItem[];
}
