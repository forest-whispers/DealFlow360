import {
    ApprovalStepLevel,
    ApprovalStepStatus,
    ChangeRequestStatus,
    FulfillmentStatus,
    InvoiceStatus,
    NegotiationStatus,
    QuotationStatus,
    SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { dealIntelligenceService } from "@/server/modules/deal-intelligence/deal-intelligence.service";
import type {
    DashboardDataResponse,
    PipelineStageMetric,
    RecentActivityItem,
} from "./dashboard.types";

export class DashboardService {
    /**
     * Aggregates authoritative commercial operations data for the organization dashboard.
     * Guaranteed organization-isolated, highly efficient queries.
     */
    async getDashboardData(user: AuthenticatedUser): Promise<DashboardDataResponse> {
        const organizationId = user.organizationId;

        // 1. Fetch Quotations for Pipeline & Active Deal metrics
        const quotations = await prisma.quotation.findMany({
            where: { organizationId },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        customerTier: true,
                    },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    select: {
                        revisionNumber: true,
                        total: true,
                        margin: true,
                        subtotal: true,
                        marginPercent: true,
                    },
                },
                negotiations: {
                    where: { status: NegotiationStatus.ACTIVE },
                    take: 1,
                    include: {
                        changeRequests: {
                            where: { status: ChangeRequestStatus.PENDING },
                            select: { id: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        // Compute Pipeline counts & values
        const pipelineStages: Record<
            QuotationStatus,
            { label: string; count: number; totalValue: number }
        > = {
            DRAFT: { label: "Draft", count: 0, totalValue: 0 },
            PENDING_APPROVAL: { label: "Pending Approval", count: 0, totalValue: 0 },
            APPROVED: { label: "Approved", count: 0, totalValue: 0 },
            SENT: { label: "Sent to Customer", count: 0, totalValue: 0 },
            UNDER_NEGOTIATION: { label: "Under Negotiation", count: 0, totalValue: 0 },
            CONFIRMED: { label: "Confirmed", count: 0, totalValue: 0 },
            REJECTED: { label: "Rejected", count: 0, totalValue: 0 },
        };

        let activeQuotationsCount = 0;
        let activeQuotationsValue = 0;
        let totalMargin = 0;
        let totalSubtotal = 0;

        for (const q of quotations) {
            const currentRevision = q.revisions[0];
            const val = currentRevision ? Number(currentRevision.total) : 0;
            const margin = currentRevision ? Number(currentRevision.margin) : 0;
            const subtotal = currentRevision ? Number(currentRevision.subtotal) : 0;

            if (pipelineStages[q.status]) {
                pipelineStages[q.status].count += 1;
                pipelineStages[q.status].totalValue += val;
            }

            // Active quotation definition: non-terminal deals (DRAFT, PENDING_APPROVAL, APPROVED, SENT, UNDER_NEGOTIATION)
            if (
                q.status === "DRAFT" ||
                q.status === "PENDING_APPROVAL" ||
                q.status === "APPROVED" ||
                q.status === "SENT" ||
                q.status === "UNDER_NEGOTIATION"
            ) {
                activeQuotationsCount += 1;
                activeQuotationsValue += val;
                totalMargin += margin;
                totalSubtotal += subtotal;
            }
        }

        const blendedMarginPercent =
            totalSubtotal > 0 ? (totalMargin / totalSubtotal) * 100 : 0;

        const pipeline: PipelineStageMetric[] = (
            [
                "DRAFT",
                "PENDING_APPROVAL",
                "APPROVED",
                "SENT",
                "UNDER_NEGOTIATION",
                "CONFIRMED",
            ] as QuotationStatus[]
        ).map((status) => ({
            status,
            label: pipelineStages[status].label,
            count: pipelineStages[status].count,
            totalValue: pipelineStages[status].totalValue,
        }));

        // 2. Pending Approval Requests & Steps
        const pendingSteps = await prisma.approvalStep.findMany({
            where: {
                status: ApprovalStepStatus.PENDING,
                approvalRequest: {
                    quotation: { organizationId },
                },
            },
            select: {
                level: true,
            },
        });

        const salesManagerPending = pendingSteps.filter(
            (s) => s.level === ApprovalStepLevel.SALES_MANAGER
        ).length;
        const financePending = pendingSteps.filter(
            (s) => s.level === ApprovalStepLevel.FINANCE_OPERATIONS
        ).length;

        // 3. Negotiations Workload
        const activeNegotiationsList: DashboardDataResponse["negotiationWorkload"]["activeNegotiations"] =
            [];
        let totalPendingChangeRequests = 0;

        for (const q of quotations) {
            if (q.status === QuotationStatus.UNDER_NEGOTIATION) {
                const activeNeg = q.negotiations[0];
                const crCount = activeNeg ? activeNeg.changeRequests.length : 0;
                totalPendingChangeRequests += crCount;

                if (activeNegotiationsList.length < 5) {
                    activeNegotiationsList.push({
                        quotationId: q.id,
                        quoteNumber: q.quoteNumber,
                        customerName: q.customer.name,
                        customerTier: q.customer.customerTier,
                        total: q.revisions[0] ? Number(q.revisions[0].total) : 0,
                        pendingChangeRequests: crCount,
                        updatedAt: q.updatedAt.toISOString(),
                    });
                }
            }
        }

        // 4. Fulfillment Status
        const fulfillments = await prisma.fulfillment.findMany({
            where: { organizationId },
            include: {
                lines: {
                    select: {
                        requiredQty: true,
                        allocatedQty: true,
                    },
                },
            },
        });

        let fulfillmentPending = 0;
        let fulfillmentPartiallyAllocated = 0;
        let fulfillmentAllocated = 0;
        let fulfillmentInProgress = 0;
        let fulfillmentFulfilled = 0;
        let totalRequiredQty = 0;
        let totalAllocatedQty = 0;

        for (const f of fulfillments) {
            if (f.status === FulfillmentStatus.PENDING) fulfillmentPending += 1;
            else if (f.status === FulfillmentStatus.PARTIALLY_ALLOCATED)
                fulfillmentPartiallyAllocated += 1;
            else if (f.status === FulfillmentStatus.ALLOCATED)
                fulfillmentAllocated += 1;
            else if (f.status === FulfillmentStatus.IN_PROGRESS)
                fulfillmentInProgress += 1;
            else if (f.status === FulfillmentStatus.FULFILLED)
                fulfillmentFulfilled += 1;

            for (const line of f.lines) {
                totalRequiredQty += line.requiredQty;
                totalAllocatedQty += line.allocatedQty;
            }
        }

        // 5. Billing & Invoices
        const invoices = await prisma.invoice.findMany({
            where: { organizationId },
            select: {
                id: true,
                status: true,
                total: true,
            },
        });

        let pendingInvoicesCount = 0;
        let paidInvoicesCount = 0;
        let outstandingAmount = 0;
        let paidAmount = 0;

        for (const inv of invoices) {
            const tot = Number(inv.total);
            if (inv.status === InvoiceStatus.PENDING) {
                pendingInvoicesCount += 1;
                outstandingAmount += tot;
            } else if (inv.status === InvoiceStatus.PAID) {
                paidInvoicesCount += 1;
                paidAmount += tot;
            }
        }

        const subscriptions = await prisma.subscription.findMany({
            where: {
                organizationId,
                status: SubscriptionStatus.ACTIVE,
            },
            select: {
                recurringAmount: true,
                billingInterval: true,
            },
        });

        let recurringMonthlyRevenue = 0;
        for (const sub of subscriptions) {
            const amt = Number(sub.recurringAmount);
            if (sub.billingInterval === "MONTHLY") {
                recurringMonthlyRevenue += amt;
            } else if (sub.billingInterval === "QUARTERLY") {
                recurringMonthlyRevenue += amt / 3;
            } else if (sub.billingInterval === "YEARLY") {
                recurringMonthlyRevenue += amt / 12;
            }
        }

        // 6. Deal Health Distribution (Batch evaluated using dealIntelligenceService for active deals)
        const healthDistribution = {
            healthy: 0,
            watch: 0,
            atRisk: 0,
            critical: 0,
        };

        // Evaluate top 10 most recent active quotations to keep execution fast and deterministic
        const activeQuotesToEvaluate = quotations.slice(0, 10);
        await Promise.all(
            activeQuotesToEvaluate.map(async (q) => {
                try {
                    const health = await dealIntelligenceService.getDealHealth(user, q.id);
                    if (health.status === "HEALTHY") healthDistribution.healthy += 1;
                    else if (health.status === "WATCH") healthDistribution.watch += 1;
                    else if (health.status === "AT_RISK") healthDistribution.atRisk += 1;
                    else if (health.status === "CRITICAL") healthDistribution.critical += 1;
                } catch {
                    // Fail-safe default if draft has no lines
                    healthDistribution.watch += 1;
                }
            })
        );

        // 7. Recent Operational Activity Feed (Synthesized deterministically from transactional records)
        const recentActivities: RecentActivityItem[] = [];

        // Latest quotations
        for (const q of quotations.slice(0, 4)) {
            recentActivities.push({
                id: `act-quote-${q.id}`,
                type: "QUOTATION",
                title: `Quotation ${q.quoteNumber}`,
                description: `${q.customer.name} • Status: ${q.status.replace(/_/g, " ")}`,
                timestamp: q.updatedAt.toISOString(),
                referenceNumber: q.quoteNumber,
                linkUrl: `/quotations/${q.id}`,
            });
        }

        // Latest payments / invoices
        const recentInvoices = await prisma.invoice.findMany({
            where: { organizationId },
            include: {
                customer: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 3,
        });

        for (const inv of recentInvoices) {
            recentActivities.push({
                id: `act-inv-${inv.id}`,
                type: "BILLING",
                title: `Invoice ${inv.invoiceNumber}`,
                description: `${inv.customer.name} • Total: ₹${Number(inv.total).toLocaleString("en-IN")} • Status: ${inv.status}`,
                timestamp: inv.updatedAt.toISOString(),
                referenceNumber: inv.invoiceNumber,
                linkUrl: `/billing/${inv.id}`,
            });
        }

        // Sort combined recent activities by timestamp desc
        recentActivities.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
            summary: {
                activeQuotationsCount,
                activeQuotationsValue,
                pendingApprovalsCount: pendingSteps.length,
                underNegotiationCount: pipelineStages.UNDER_NEGOTIATION.count,
                confirmedDealsCount: pipelineStages.CONFIRMED.count,
                outstandingBillingAmount: outstandingAmount,
                outstandingInvoicesCount: pendingInvoicesCount,
                blendedMarginPercent,
                totalAllocatedUnits: totalAllocatedQty,
            },
            pipeline,
            approvalWorkload: [
                {
                    level: "SALES_MANAGER",
                    label: "Sales Manager",
                    pendingCount: salesManagerPending,
                },
                {
                    level: "FINANCE_OPERATIONS",
                    label: "Finance Operations",
                    pendingCount: financePending,
                },
            ],
            negotiationWorkload: {
                underNegotiationCount: pipelineStages.UNDER_NEGOTIATION.count,
                pendingChangeRequestsCount: totalPendingChangeRequests,
                activeNegotiations: activeNegotiationsList,
            },
            fulfillment: {
                pendingCount: fulfillmentPending,
                partiallyAllocatedCount: fulfillmentPartiallyAllocated,
                allocatedCount: fulfillmentAllocated,
                inProgressCount: fulfillmentInProgress,
                fulfilledCount: fulfillmentFulfilled,
                totalRequiredQty,
                totalAllocatedQty,
            },
            billing: {
                pendingInvoicesCount,
                paidInvoicesCount,
                outstandingAmount,
                paidAmount,
                activeSubscriptionsCount: subscriptions.length,
                recurringMonthlyRevenue,
            },
            dealHealthDistribution: healthDistribution,
            recentActivities: recentActivities.slice(0, 6),
        };
    }
}

export const dashboardService = new DashboardService();
