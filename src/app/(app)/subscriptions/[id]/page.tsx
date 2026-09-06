"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { SubscriptionLinesTable } from "@/components/billing/subscription-lines-table";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { formatDate } from "@/lib/formatters";
import { BILLING_INTERVAL_META } from "@/lib/constants";
import {
    ArrowLeft,
    Calendar,
    FileText,
    Receipt,
    Repeat,
    RotateCw,
    User,
} from "lucide-react";
import type {
    SubscriptionResponse,
    InvoiceListResponse,
    InvoiceSummaryResponse,
} from "@/server/modules/billing/billing.types";

interface SubscriptionDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function SubscriptionDetailPage({
    params,
}: SubscriptionDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Related Invoice (for mixed billing)
    const [relatedInvoices, setRelatedInvoices] = useState<InvoiceSummaryResponse[]>([]);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setErrorMessage(null);

        apiClient
            .get<SubscriptionResponse>(API_ROUTES.SUBSCRIPTIONS.BY_ID(id))
            .then((res) => {
                if (isMounted) {
                    setSubscription(res);

                    // Check for related invoices from the same quotation
                    if (res.quotationId) {
                        apiClient
                            .get<InvoiceListResponse>(API_ROUTES.INVOICES.LIST, {
                                params: { quotationId: res.quotationId },
                            })
                            .then((invRes) => {
                                if (isMounted && invRes.invoices) {
                                    setRelatedInvoices(invRes.invoices);
                                }
                            })
                            .catch(() => {});
                    }
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load subscription details.";
                    setErrorMessage(msg);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [id, refreshTrigger]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2 pb-4 border-b border-[#E2E8F0]">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                </div>
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    if (errorMessage || !subscription) {
        return (
            <div className="space-y-6">
                <Link
                    href="/billing?tab=subscriptions"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Subscriptions
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Subscription Not Found"
                            message={errorMessage || "The requested subscription could not be loaded."}
                            onRetry={() => {
                                setIsLoading(true);
                                setErrorMessage(null);
                                setRefreshTrigger((prev) => prev + 1);
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const intervalLabel =
        BILLING_INTERVAL_META[subscription.billingInterval]?.label ??
        subscription.billingInterval;

    return (
        <div className="space-y-6">
            {/* Top Navigation Backlink */}
            <div>
                <Link
                    href="/billing?tab=subscriptions"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Billing & Subscriptions
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[24px] font-bold tracking-tight text-[#0F172A]">
                            {subscription.subscriptionNumber}
                        </h1>
                        <StatusBadge
                            type="subscription"
                            status={subscription.status}
                        />
                        <Badge variant="info" size="default">
                            {intervalLabel} Cadence
                        </Badge>
                    </div>
                    <p className="text-[13px] text-[#64748B]">
                        Active recurring subscription schedule generated from Confirmed Quotation revision.
                    </p>
                </div>

                <div>
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setRefreshTrigger((prev) => prev + 1)}
                    >
                        <RotateCw className="w-4 h-4 mr-1.5" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Context & KPI Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <User className="w-3.5 h-3.5" />
                            <span>Customer</span>
                        </div>
                        <Link
                            href={`/customers/${subscription.customerId}`}
                            className="font-semibold text-[14px] text-[#0F172A] hover:text-[#1E40AF] block truncate"
                        >
                            {subscription.customerName}
                        </Link>
                        <span className="text-[11px] text-[#94A3B8]">
                            Subscriber Account
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Quotation Origin</span>
                        </div>
                        <Link
                            href={`/quotations/${subscription.quotationId}`}
                            className="font-mono font-semibold text-[14px] text-[#1E40AF] hover:underline block truncate"
                        >
                            {subscription.quotationNumber}{" "}
                            <span className="text-[12px] font-normal text-[#64748B]">
                                (Rev #{subscription.revisionNumber})
                            </span>
                        </Link>
                        <span className="text-[11px] text-[#94A3B8]">
                            Confirmed Agreement
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <Repeat className="w-3.5 h-3.5" />
                            <span>Recurring Amount</span>
                        </div>
                        <div className="font-bold text-[18px] text-[#0F172A]">
                            <FinancialNumeral value={subscription.recurringAmount} />
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                            Billed {intervalLabel.toLowerCase()}
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Billing Cycle</span>
                        </div>
                        <div className="font-semibold text-[13px] text-[#0F172A]">
                            Next: {formatDate(subscription.nextBillingDate, "short")}
                        </div>
                        <span className="text-[11px] text-[#94A3B8]">
                            Started {formatDate(subscription.startDate, "short")}
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Mixed Billing Notice Banner (if quotation also generated one-time invoice) */}
            {relatedInvoices.length > 0 && (
                <div className="p-4 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-[#1E40AF] shrink-0" />
                        <div className="text-[13px] text-[#1E40AF]">
                            <strong>Mixed Deal Notice:</strong> This quotation also generated{" "}
                            <strong>Invoice {relatedInvoices[0].invoiceNumber}</strong> for one-time equipment or setup charges.
                        </div>
                    </div>
                    <div>
                        <Link href={`/billing/${relatedInvoices[0].id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[12px] bg-white">
                                View Invoice ({relatedInvoices[0].invoiceNumber})
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Subscription Line Items Table */}
            <SubscriptionLinesTable
                lines={subscription.lines}
                recurringAmount={subscription.recurringAmount}
                interval={subscription.billingInterval}
            />
        </div>
    );
}
