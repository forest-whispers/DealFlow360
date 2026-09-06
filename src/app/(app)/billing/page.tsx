"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { InvoiceTable } from "@/components/billing/invoice-table";
import { SubscriptionTable } from "@/components/billing/subscription-table";
import { GenerateBillingModal } from "@/components/billing/generate-billing-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import {
    BILLING_GENERATE_ROLES,
    INVOICE_READ_ROLES,
    SUBSCRIPTION_READ_ROLES,
} from "@/lib/constants";
import {
    FileText,
    Plus,
    Receipt,
    Repeat,
    RotateCw,
} from "lucide-react";
import type {
    InvoiceListResponse,
    InvoiceSummaryResponse,
    SubscriptionListResponse,
    SubscriptionSummaryResponse,
    BillingPaginationMeta,
} from "@/server/modules/billing/billing.types";
import type { InvoiceStatus, SubscriptionStatus, BillingInterval } from "@prisma/client";

function BillingWorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser } = useAuth();

    // Tab state from URL query (default to "invoices")
    const initialTab = searchParams.get("tab") === "subscriptions" ? "subscriptions" : "invoices";
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    // Refresh trigger
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Invoices state
    const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
    const [isInvoicesLoading, setIsInvoicesLoading] = useState<boolean>(true);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("");
    const [invoicePage, setInvoicePage] = useState<number>(1);
    const [invoicePagination, setInvoicePagination] = useState<BillingPaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Subscriptions state
    const [subscriptions, setSubscriptions] = useState<SubscriptionSummaryResponse[]>([]);
    const [isSubscriptionsLoading, setIsSubscriptionsLoading] = useState<boolean>(true);
    const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
    const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>("");
    const [subscriptionIntervalFilter, setSubscriptionIntervalFilter] = useState<string>("");
    const [subscriptionPage, setSubscriptionPage] = useState<number>(1);
    const [subscriptionPagination, setSubscriptionPagination] = useState<BillingPaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Modal state
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);

    const canGenerateBilling = Boolean(
        currentUser &&
            (BILLING_GENERATE_ROLES as readonly string[]).includes(currentUser.role)
    );

    // Sync tab changes with URL
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tabId);
        router.replace(`/billing?${params.toString()}`);
    };

    // Fetch Invoices
    useEffect(() => {
        let isMounted = true;
        setIsInvoicesLoading(true);
        setInvoiceError(null);

        const params: Record<string, string | number> = {
            page: invoicePage,
            limit: 20,
        };
        if (invoiceStatusFilter) {
            params.status = invoiceStatusFilter;
        }

        apiClient
            .get<InvoiceListResponse>(API_ROUTES.INVOICES.LIST, { params })
            .then((res) => {
                if (isMounted) {
                    setInvoices(res.invoices || []);
                    setInvoicePagination(
                        res.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
                    );
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg =
                        err instanceof Error ? err.message : "Failed to load invoices.";
                    setInvoiceError(msg);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsInvoicesLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [invoicePage, invoiceStatusFilter, refreshTrigger]);

    // Fetch Subscriptions
    useEffect(() => {
        let isMounted = true;
        setIsSubscriptionsLoading(true);
        setSubscriptionError(null);

        const params: Record<string, string | number> = {
            page: subscriptionPage,
            limit: 20,
        };
        if (subscriptionStatusFilter) {
            params.status = subscriptionStatusFilter;
        }
        if (subscriptionIntervalFilter) {
            params.billingInterval = subscriptionIntervalFilter;
        }

        apiClient
            .get<SubscriptionListResponse>(API_ROUTES.SUBSCRIPTIONS.LIST, { params })
            .then((res) => {
                if (isMounted) {
                    setSubscriptions(res.subscriptions || []);
                    setSubscriptionPagination(
                        res.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
                    );
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load subscriptions.";
                    setSubscriptionError(msg);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsSubscriptionsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [subscriptionPage, subscriptionStatusFilter, subscriptionIntervalFilter, refreshTrigger]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <PageHeader
                title="Billing & Subscriptions"
                description="Manage one-time commercial invoices, recurring subscriptions, and payment settlements."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing" },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="default"
                            onClick={() => setRefreshTrigger((prev) => prev + 1)}
                            className="h-9"
                        >
                            <RotateCw className="w-4 h-4 mr-1.5" />
                            Refresh
                        </Button>

                        {canGenerateBilling && (
                            <Button
                                variant="primary"
                                size="default"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setIsGenerateModalOpen(true)}
                                className="h-9"
                            >
                                Generate Billing
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Authoritative Metric Count Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-lg bg-[#EFF6FF] text-[#1E40AF]">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
                                Total Invoices
                            </span>
                            <span className="text-[20px] font-bold text-[#0F172A]">
                                {invoicePagination.total}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-lg bg-[#F0FDF4] text-[#16A34A]">
                            <Repeat className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
                                Total Subscriptions
                            </span>
                            <span className="text-[20px] font-bold text-[#0F172A]">
                                {subscriptionPagination.total}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-lg bg-[#F8FAFC] text-[#475569]">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
                                Active Workspace View
                            </span>
                            <span className="text-[14px] font-semibold text-[#0F172A] capitalize">
                                {activeTab}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs: Invoices & Subscriptions */}
            <Tabs
                tabs={[
                    {
                        id: "invoices",
                        label: "Invoices",
                        badge: invoicePagination.total,
                        icon: <Receipt className="w-4 h-4" />,
                    },
                    {
                        id: "subscriptions",
                        label: "Subscriptions",
                        badge: subscriptionPagination.total,
                        icon: <Repeat className="w-4 h-4" />,
                    },
                ]}
                activeTab={activeTab}
                onChange={handleTabChange}
            />

            {/* Invoices Tab View */}
            {activeTab === "invoices" && (
                <div className="space-y-4">
                    {/* Invoice Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-[#64748B]">
                                Status:
                            </span>
                            <div className="w-44">
                                <Select
                                    value={invoiceStatusFilter}
                                    onChange={(e) => {
                                        setInvoiceStatusFilter(e.target.value);
                                        setInvoicePage(1);
                                    }}
                                    options={[
                                        { value: "", label: "All Statuses" },
                                        { value: "PENDING", label: "Pending" },
                                        { value: "PAID", label: "Paid" },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="text-[12px] text-[#64748B]">
                            {invoicePagination.total} invoice(s) matching filter
                        </div>
                    </div>

                    {invoiceError ? (
                        <Card>
                            <CardContent className="p-6">
                                <ErrorState
                                    title="Failed to Load Invoices"
                                    message={invoiceError}
                                    onRetry={() => setRefreshTrigger((prev) => prev + 1)}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <InvoiceTable
                            invoices={invoices}
                            isLoading={isInvoicesLoading}
                            page={invoicePage}
                            totalPages={invoicePagination.totalPages}
                            total={invoicePagination.total}
                            onPageChange={(p) => setInvoicePage(p)}
                        />
                    )}
                </div>
            )}

            {/* Subscriptions Tab View */}
            {activeTab === "subscriptions" && (
                <div className="space-y-4">
                    {/* Subscription Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[#64748B]">
                                    Status:
                                </span>
                                <div className="w-40">
                                    <Select
                                        value={subscriptionStatusFilter}
                                        onChange={(e) => {
                                            setSubscriptionStatusFilter(e.target.value);
                                            setSubscriptionPage(1);
                                        }}
                                        options={[
                                            { value: "", label: "All Statuses" },
                                            { value: "ACTIVE", label: "Active" },
                                            { value: "CANCELLED", label: "Cancelled" },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[#64748B]">
                                    Cadence:
                                </span>
                                <div className="w-40">
                                    <Select
                                        value={subscriptionIntervalFilter}
                                        onChange={(e) => {
                                            setSubscriptionIntervalFilter(e.target.value);
                                            setSubscriptionPage(1);
                                        }}
                                        options={[
                                            { value: "", label: "All Intervals" },
                                            { value: "MONTHLY", label: "Monthly" },
                                            { value: "QUARTERLY", label: "Quarterly" },
                                            { value: "YEARLY", label: "Yearly" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="text-[12px] text-[#64748B]">
                            {subscriptionPagination.total} subscription(s) matching filter
                        </div>
                    </div>

                    {subscriptionError ? (
                        <Card>
                            <CardContent className="p-6">
                                <ErrorState
                                    title="Failed to Load Subscriptions"
                                    message={subscriptionError}
                                    onRetry={() => setRefreshTrigger((prev) => prev + 1)}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <SubscriptionTable
                            subscriptions={subscriptions}
                            isLoading={isSubscriptionsLoading}
                            page={subscriptionPage}
                            totalPages={subscriptionPagination.totalPages}
                            total={subscriptionPagination.total}
                            onPageChange={(p) => setSubscriptionPage(p)}
                        />
                    )}
                </div>
            )}

            {/* Generate Billing Modal */}
            <GenerateBillingModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
        </div>
    );
}

export default function BillingWorkspacePage() {
    return (
        <Suspense fallback={<div className="p-6 text-[#64748B]">Loading billing workspace...</div>}>
            <BillingWorkspaceContent />
        </Suspense>
    );
}
