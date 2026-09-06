"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { InvoiceLinesTable } from "@/components/billing/invoice-lines-table";
import { PaymentHistoryCard } from "@/components/billing/payment-history-card";
import { PaymentModal } from "@/components/billing/payment-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { INVOICE_PAY_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    CreditCard,
    FileText,
    Receipt,
    Repeat,
    RotateCw,
    User,
} from "lucide-react";
import type {
    InvoiceResponse,
    SubscriptionListResponse,
    SubscriptionSummaryResponse,
} from "@/server/modules/billing/billing.types";

interface InvoiceDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Related Subscriptions (for mixed billing)
    const [relatedSubscriptions, setRelatedSubscriptions] = useState<SubscriptionSummaryResponse[]>([]);

    // Payment Action
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
    const [isPaying, setIsPaying] = useState<boolean>(false);

    const canPayInvoice = Boolean(
        currentUser &&
            (INVOICE_PAY_ROLES as readonly string[]).includes(currentUser.role) &&
            invoice?.status === "PENDING"
    );

    // Fetch authoritative invoice record
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setErrorMessage(null);

        apiClient
            .get<InvoiceResponse>(API_ROUTES.INVOICES.BY_ID(id))
            .then((res) => {
                if (isMounted) {
                    setInvoice(res);

                    // Check for related recurring subscriptions from the same quotation
                    if (res.quotationId) {
                        apiClient
                            .get<SubscriptionListResponse>(API_ROUTES.SUBSCRIPTIONS.LIST, {
                                params: { quotationId: res.quotationId },
                            })
                            .then((subRes) => {
                                if (isMounted && subRes.subscriptions) {
                                    setRelatedSubscriptions(subRes.subscriptions);
                                }
                            })
                            .catch(() => {});
                    }
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg =
                        err instanceof Error ? err.message : "Failed to load invoice details.";
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

    // Handle Pay Invoice Action
    const handleConfirmPayment = async () => {
        if (!invoice || invoice.status !== "PENDING") return;

        setIsPaying(true);

        try {
            const updatedInvoice = await apiClient.post<InvoiceResponse>(
                API_ROUTES.INVOICES.PAY(invoice.id),
                {}
            );

            // Authoritative state update
            setInvoice(updatedInvoice);
            setIsPaymentModalOpen(false);

            toast.success(
                "Payment Recorded",
                `Invoice ${updatedInvoice.invoiceNumber} has been successfully settled.`
            );
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to process invoice payment.";
            toast.error("Payment Failed", msg);
        } finally {
            setIsPaying(false);
        }
    };

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
                <Skeleton className="h-40 rounded-lg" />
            </div>
        );
    }

    if (errorMessage || !invoice) {
        return (
            <div className="space-y-6">
                <Link
                    href="/billing"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Billing
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Invoice Not Found"
                            message={errorMessage || "The requested invoice could not be loaded."}
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

    return (
        <div className="space-y-6">
            {/* Top Navigation Backlink */}
            <div>
                <Link
                    href="/billing"
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
                            {invoice.invoiceNumber}
                        </h1>
                        <StatusBadge type="billing" status={invoice.status} />
                    </div>
                    <p className="text-[13px] text-[#64748B]">
                        Commercial Billing Invoice generated from Confirmed Quotation revision.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setRefreshTrigger((prev) => prev + 1)}
                    >
                        <RotateCw className="w-4 h-4 mr-1.5" />
                        Refresh
                    </Button>

                    {canPayInvoice && (
                        <Button
                            variant="primary"
                            size="default"
                            leftIcon={<CreditCard className="w-4 h-4" />}
                            onClick={() => setIsPaymentModalOpen(true)}
                        >
                            Record Payment
                        </Button>
                    )}
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
                            href={`/customers/${invoice.customerId}`}
                            className="font-semibold text-[14px] text-[#0F172A] hover:text-[#1E40AF] block truncate"
                        >
                            {invoice.customerName}
                        </Link>
                        <span className="text-[11px] text-[#94A3B8]">
                            Account Billed
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
                            href={`/quotations/${invoice.quotationId}`}
                            className="font-mono font-semibold text-[14px] text-[#1E40AF] hover:underline block truncate"
                        >
                            {invoice.quotationNumber}{" "}
                            <span className="text-[12px] font-normal text-[#64748B]">
                                (Rev #{invoice.revisionNumber})
                            </span>
                        </Link>
                        <span className="text-[11px] text-[#94A3B8]">
                            Confirmed Deal
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Total Invoice Value</span>
                        </div>
                        <div className="font-bold text-[18px] text-[#0F172A]">
                            <FinancialNumeral value={invoice.total} />
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                            Subtotal: <FinancialNumeral value={invoice.subtotal} />
                        </span>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-[#E2E8F0]">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Settlement Status</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {invoice.status === "PAID" ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                                    <span className="text-[13px] font-semibold text-[#16A34A]">
                                        Settled on {formatDate(invoice.paidAt, "short")}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[13px] font-semibold text-[#D97706]">
                                    Pending Payment
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-[#94A3B8]">
                            Issued {formatDate(invoice.createdAt, "short")}
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Mixed Billing Notice Banner (if quotation also has active recurring subscriptions) */}
            {relatedSubscriptions.length > 0 && (
                <div className="p-4 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Repeat className="w-5 h-5 text-[#1E40AF] shrink-0" />
                        <div className="text-[13px] text-[#1E40AF]">
                            <strong>Mixed Deal Notice:</strong> This quotation also generated{" "}
                            <strong>{relatedSubscriptions.length} recurring subscription(s)</strong>.
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {relatedSubscriptions.map((s) => (
                            <Link key={s.id} href={`/subscriptions/${s.id}`}>
                                <Button variant="outline" size="sm" className="h-8 text-[12px] bg-white">
                                    View {s.subscriptionNumber} ({s.billingInterval.toLowerCase()})
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoice Line Items Table */}
            <InvoiceLinesTable
                lines={invoice.lines}
                subtotal={invoice.subtotal}
                total={invoice.total}
            />

            {/* Payment Settlement History */}
            <PaymentHistoryCard
                payments={invoice.payments}
                status={invoice.status}
            />

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                invoiceNumber={invoice.invoiceNumber}
                customerName={invoice.customerName}
                total={invoice.total}
                isPaying={isPaying}
                onConfirmPayment={handleConfirmPayment}
            />
        </div>
    );
}
