"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
    RotateCcw,
    FileText,
    ShieldCheck,
    MessageSquare,
    CheckCircle2,
    Truck,
    Receipt,
    Activity,
    ArrowRight,
    TrendingUp,
    Clock,
} from "lucide-react";
import type { DashboardDataResponse } from "@/server/modules/dashboard/dashboard.types";

export default function DashboardPage() {
    const [data, setData] = useState<DashboardDataResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.getDashboard<DashboardDataResponse>();
            setData(res);
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Unable to load dashboard data.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiClient
            .getDashboard<DashboardDataResponse>()
            .then((res) => {
                if (isMounted) {
                    setData(res);
                    setError(null);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    const message =
                        err instanceof ApiClientError
                            ? err.message
                            : "Unable to load dashboard data.";
                    setError(message);
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="space-y-8">
            {/* Standard Page Header */}
            <PageHeader
                title="Commercial Operations Command Center"
                description="Authoritative, organization-scoped overview of sales pipeline, governance approvals, negotiations, fulfillment, and billing."
                breadcrumbs={[
                    { label: "DealFlow360", href: "/dashboard" },
                    { label: "Operations" },
                    { label: "Overview" },
                ]}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboard}
                        isLoading={isLoading}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                        Refresh Data
                    </Button>
                }
            />

            {/* Error State */}
            {!isLoading && error && (
                <ErrorState
                    title="Unable to load dashboard data"
                    message={error}
                    onRetry={fetchDashboard}
                />
            )}

            {/* Loading Skeletons */}
            {isLoading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-3"
                            >
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Live Dashboard Data */}
            {!isLoading && !error && data && (
                <>
                    {/* Executive Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Active Deal Volume */}
                        <Card>
                            <CardContent className="p-4 space-y-1">
                                <div className="flex items-center justify-between text-[#475569]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                        Active Deal Pipeline
                                    </span>
                                    <StatusBadge type="quotation" status="UNDER_NEGOTIATION" size="sm" />
                                </div>
                                <div>
                                    <FinancialNumeral
                                        amount={data.summary.activeQuotationsValue}
                                        currency="INR"
                                        variant="display"
                                    />
                                </div>
                                <p className="text-[11px] leading-4 text-[#475569]">
                                    {data.summary.activeQuotationsCount} quotation{data.summary.activeQuotationsCount !== 1 ? "s" : ""} in active progress
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card 2: Approval Queue */}
                        <Card>
                            <CardContent className="p-4 space-y-1">
                                <div className="flex items-center justify-between text-[#475569]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                        Pending Approvals
                                    </span>
                                    <StatusBadge
                                        type="quotation"
                                        status={data.summary.pendingApprovalsCount > 0 ? "PENDING_APPROVAL" : "APPROVED"}
                                        size="sm"
                                    />
                                </div>
                                <div className="text-[24px] font-bold text-[#0F172A] tabular-nums tracking-tight">
                                    {data.summary.pendingApprovalsCount}
                                </div>
                                <p className="text-[11px] leading-4 text-[#B45309] font-medium">
                                    {data.approvalWorkload[0].pendingCount} Manager • {data.approvalWorkload[1].pendingCount} Finance
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card 3: Blended Margin */}
                        <Card>
                            <CardContent className="p-4 space-y-1">
                                <div className="flex items-center justify-between text-[#475569]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                        Blended Margin
                                    </span>
                                    <StatusBadge
                                        type="deal-health"
                                        status={data.summary.blendedMarginPercent >= 25 ? "HEALTHY" : "WATCH"}
                                        size="sm"
                                    />
                                </div>
                                <div>
                                    <FinancialNumeral
                                        rate={data.summary.blendedMarginPercent}
                                        type="percentage"
                                        variant="display"
                                    />
                                </div>
                                <p className="text-[11px] leading-4 text-[#475569]">
                                    Calculated across active commercial lines
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card 4: Outstanding Billing */}
                        <Card>
                            <CardContent className="p-4 space-y-1">
                                <div className="flex items-center justify-between text-[#475569]">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                        Outstanding Invoices
                                    </span>
                                    <StatusBadge
                                        type="billing"
                                        status={data.summary.outstandingInvoicesCount > 0 ? "PENDING" : "PAID"}
                                        size="sm"
                                    />
                                </div>
                                <div>
                                    <FinancialNumeral
                                        amount={data.summary.outstandingBillingAmount}
                                        currency="INR"
                                        variant="display"
                                    />
                                </div>
                                <p className="text-[11px] leading-4 text-[#475569]">
                                    {data.summary.outstandingInvoicesCount} invoice{data.summary.outstandingInvoicesCount !== 1 ? "s" : ""} awaiting payment
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 1: Pipeline Breakdown & Deal Health Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quotation Pipeline Breakdown */}
                        <Card className="lg:col-span-2">
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[#1E40AF]" />
                                        Quotation Pipeline by Stage
                                    </span>
                                    <Link
                                        href="/quotations"
                                        className="text-[12px] font-medium text-[#1E40AF] hover:underline flex items-center gap-1"
                                    >
                                        View All
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </CardTitle>
                                <CardDescription>
                                    Transactional status distribution and cumulative value for commercial quotes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Stage</TableHead>
                                            <TableHead align="right">Count</TableHead>
                                            <TableHead align="right">Total Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.pipeline.map((stage) => (
                                            <TableRow key={stage.status}>
                                                <TableCell className="font-medium text-[#0F172A]">
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge type="quotation" status={stage.status} size="sm" />
                                                        <span>{stage.label}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell isNumeric className="font-semibold text-[#0F172A]">
                                                    {stage.count}
                                                </TableCell>
                                                <TableCell isNumeric>
                                                    <FinancialNumeral amount={stage.totalValue} variant="body" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Deal Health Distribution */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-[#1E40AF]" />
                                    Deal Health Overview
                                </CardTitle>
                                <CardDescription>
                                    Deterministic multi-risk assessment for active quotations.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge type="deal-health" status="HEALTHY" size="sm" />
                                        <span className="text-[12px] text-[#475569]">Healthy</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                        {data.dealHealthDistribution.healthy}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge type="deal-health" status="WATCH" size="sm" />
                                        <span className="text-[12px] text-[#475569]">Watch</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                        {data.dealHealthDistribution.watch}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge type="deal-health" status="AT_RISK" size="sm" />
                                        <span className="text-[12px] text-[#475569]">At Risk</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                        {data.dealHealthDistribution.atRisk}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge type="deal-health" status="CRITICAL" size="sm" />
                                        <span className="text-[12px] text-[#475569]">Critical</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                        {data.dealHealthDistribution.critical}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 2: Operational Workloads (Approvals, Negotiations, Fulfillment, Billing) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Approvals Workload */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-[#64748B]" />
                                        Approvals Workload
                                    </span>
                                    <Link href="/approvals" className="text-[11px] text-[#1E40AF] hover:underline">
                                        Queue
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2 text-[12px]">
                                <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                                    <span className="text-[#64748B]">Sales Manager:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.approvalWorkload[0].pendingCount} pending
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-[#64748B]">Finance Ops:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.approvalWorkload[1].pendingCount} pending
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Negotiations Workload */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <MessageSquare className="w-4 h-4 text-[#64748B]" />
                                        Negotiation Activity
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2 text-[12px]">
                                <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                                    <span className="text-[#64748B]">Under Negotiation:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.negotiationWorkload.underNegotiationCount}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-[#64748B]">Pending Changes:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.negotiationWorkload.pendingChangeRequestsCount} request{data.negotiationWorkload.pendingChangeRequestsCount !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Fulfillment Status */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Truck className="w-4 h-4 text-[#64748B]" />
                                        Fulfillment Status
                                    </span>
                                    <Link href="/fulfillment" className="text-[11px] text-[#1E40AF] hover:underline">
                                        View
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2 text-[12px]">
                                <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                                    <span className="text-[#64748B]">Allocated Units:</span>
                                    <span className="font-semibold text-[#047857] tabular-nums">
                                        {data.fulfillment.totalAllocatedQty} / {data.fulfillment.totalRequiredQty}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-[#64748B]">Ready / Fulfilled:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.fulfillment.allocatedCount + data.fulfillment.fulfilledCount} orders
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Billing Status */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Receipt className="w-4 h-4 text-[#64748B]" />
                                        Billing & MRR
                                    </span>
                                    <Link href="/billing" className="text-[11px] text-[#1E40AF] hover:underline">
                                        View
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2 text-[12px]">
                                <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                                    <span className="text-[#64748B]">Active Subscriptions:</span>
                                    <span className="font-semibold text-[#0F172A] tabular-nums">
                                        {data.billing.activeSubscriptionsCount}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-[#64748B]">Est. MRR:</span>
                                    <FinancialNumeral amount={data.billing.recurringMonthlyRevenue} variant="body" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 3: Active Negotiations & Recent Operational Activity Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Active Negotiations Spotlight */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-[#1E40AF]" />
                                    Active Commercial Negotiations
                                </CardTitle>
                                <CardDescription>
                                    Quotations currently in active customer dialogue requiring review.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.negotiationWorkload.activeNegotiations.length === 0 ? (
                                    <div className="p-6">
                                        <EmptyState
                                            icon={<CheckCircle2 className="w-6 h-6 text-[#16A34A]" />}
                                            title="No Active Negotiations"
                                            description="No customer quotations are currently under commercial renegotiation."
                                        />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Quotation #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead align="right">Value</TableHead>
                                                <TableHead>Pending CRs</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.negotiationWorkload.activeNegotiations.map((neg) => (
                                                <TableRow key={neg.quotationId} isClickable>
                                                    <TableCell className="font-semibold text-[#1E40AF]">
                                                        <Link href={`/quotations/${neg.quotationId}`} className="hover:underline">
                                                            {neg.quoteNumber}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-[#0F172A]">
                                                        {neg.customerName}
                                                    </TableCell>
                                                    <TableCell isNumeric>
                                                        <FinancialNumeral amount={neg.total} variant="body" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-[#B45309] tabular-nums text-[12px]">
                                                            {neg.pendingChangeRequests} request{neg.pendingChangeRequests !== 1 ? "s" : ""}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Operational Activity Feed */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#1E40AF]" />
                                    Recent Operational Events
                                </CardTitle>
                                <CardDescription>
                                    Transactional updates across quotations, billing, and fulfillment.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-3 pb-3">
                                {data.recentActivities.length === 0 ? (
                                    <div className="p-6">
                                        <EmptyState
                                            icon={<FileText className="w-6 h-6 text-[#94A3B8]" />}
                                            title="No Recent Events"
                                            description="Transactional events will be recorded here as deals progress."
                                        />
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[#F1F5F9]">
                                        {data.recentActivities.map((act) => (
                                            <div
                                                key={act.id}
                                                className="py-2.5 flex items-center justify-between text-[12px]"
                                            >
                                                <div className="min-w-0 pr-3">
                                                    <div className="font-semibold text-[#0F172A] truncate">
                                                        {act.linkUrl ? (
                                                            <Link href={act.linkUrl} className="hover:underline hover:text-[#1E40AF]">
                                                                {act.title}
                                                            </Link>
                                                        ) : (
                                                            act.title
                                                        )}
                                                    </div>
                                                    <div className="text-[#475569] text-[11px] truncate">
                                                        {act.description}
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">
                                                    {new Date(act.timestamp).toLocaleDateString("en-IN", {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
