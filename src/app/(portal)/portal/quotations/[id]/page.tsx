"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalQuotationLines } from "@/components/portal/portal-quotation-lines";
import { PortalCommercialSummary } from "@/components/portal/portal-commercial-summary";
import { NegotiationTimeline } from "@/components/portal/negotiation-timeline";
import { NegotiationComposer } from "@/components/portal/negotiation-composer";
import { NegotiationPreviewCard } from "@/components/portal/negotiation-preview-card";
import { ChangeRequestModal } from "@/components/portal/change-request-modal";
import { QuotationConfirmModal } from "@/components/portal/quotation-confirm-modal";
import { PaymentModal } from "@/components/billing/payment-modal";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronLeft,
    CreditCard,
    Receipt,
    SlidersHorizontal,
    FileText,
} from "lucide-react";
import type {
    InvoiceListResponse,
    InvoiceSummaryResponse,
    InvoiceResponse,
} from "@/server/modules/billing/billing.types";
import type {
    CreateChangeRequestInput,
    PortalNegotiationHistoryResponse,
    PortalQuotationDetailResponse,
} from "@/server/modules/negotiation/negotiation.types";
import type {
    NegotiationChange,
    NegotiationPreviewResult,
} from "@/server/modules/ai/negotiation/negotiation.types";

interface CustomerQuotationDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function CustomerQuotationDetailPage({
    params,
}: CustomerQuotationDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const { toast } = useToast();

    // Data state
    const [quotation, setQuotation] = useState<PortalQuotationDetailResponse | null>(null);
    const [negotiation, setNegotiation] = useState<PortalNegotiationHistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // AI Preview state
    const [previewResult, setPreviewResult] = useState<NegotiationPreviewResult | null>(null);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [isExecutingAI, setIsExecutingAI] = useState<boolean>(false);

    // Messaging & Change Request state
    const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
    const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] = useState<boolean>(false);
    const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState<boolean>(false);
    const [targetLineNumber, setTargetLineNumber] = useState<number | undefined>(undefined);

    // Confirmation state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [isConfirming, setIsConfirming] = useState<boolean>(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    // Billing & Invoice State
    const [customerInvoice, setCustomerInvoice] = useState<InvoiceSummaryResponse | null>(null);
    const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
    const [isPayingInvoice, setIsPayingInvoice] = useState<boolean>(false);

    const refreshData = useCallback(() => {
        setRefreshTrigger((prev) => prev + 1);
    }, []);

    // Fetch quotation and negotiation history
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const [quoteRes, negRes] = await Promise.all([
                    apiClient.get<PortalQuotationDetailResponse>(
                        API_ROUTES.PORTAL.QUOTATIONS.BY_ID(id)
                    ),
                    apiClient.get<PortalNegotiationHistoryResponse>(
                        API_ROUTES.PORTAL.QUOTATIONS.NEGOTIATION(id)
                    ),
                ]);

                if (isMounted) {
                    setQuotation(quoteRes);
                    setNegotiation(negRes);
                    setErrorMessage(null);
                    setIsLoading(false);

                    // If Confirmed, authoritatively fetch customer-scoped invoice
                    if (quoteRes.status === "CONFIRMED") {
                        apiClient
                            .get<InvoiceListResponse>(API_ROUTES.INVOICES.LIST, {
                                params: { quotationId: id },
                            })
                            .then((invRes) => {
                                if (isMounted && invRes.invoices && invRes.invoices.length > 0) {
                                    setCustomerInvoice(invRes.invoices[0]);
                                }
                            })
                            .catch(() => {});
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    if (err instanceof ApiClientError) {
                        setErrorMessage(err.message);
                    } else if (err instanceof Error) {
                        setErrorMessage(err.message);
                    } else {
                        setErrorMessage("Failed to load quotation details.");
                    }
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [id, refreshTrigger]);

    // Handle sending a standard discussion message
    const handleSendMessage = async (messageText: string) => {
        setIsSendingMessage(true);
        try {
            await apiClient.post(
                API_ROUTES.PORTAL.QUOTATIONS.MESSAGES(id),
                { message: messageText }
            );

            toast.success("Message sent", "Your note has been added to the commercial discussion.");
            refreshData();
        } catch (err: unknown) {
            const msg = err instanceof ApiClientError ? err.message : "Failed to send message.";
            toast.error("Error", msg);
            throw err;
        } finally {
            setIsSendingMessage(false);
        }
    };

    // Handle previewing natural-language negotiation proposal
    const handlePreviewMessage = async (messageText: string) => {
        setIsPreviewing(true);
        setPreviewResult(null);

        try {
            const res = await apiClient.post<NegotiationPreviewResult>(
                API_ROUTES.AI_NEGOTIATION.PREVIEW(id),
                { message: messageText }
            );

            setPreviewResult(res);

            if (res.status === "INTERPRETED") {
                toast.info(
                    "Proposal Interpreted",
                    "Calculated commercial preview is ready. Review changes before submitting."
                );
            } else if (res.status === "AMBIGUOUS") {
                toast.warning(
                    "Clarification Needed",
                    "Could not clearly identify the specific target lines. Please specify line numbers or quantities."
                );
            } else {
                toast.warning(
                    "Unsupported Request",
                    "Please request discount or quantity changes, or send a general message."
                );
            }
        } catch (err: unknown) {
            const msg = err instanceof ApiClientError ? err.message : "Failed to interpret proposal.";
            toast.error("Interpretation Error", msg);
            throw err;
        } finally {
            setIsPreviewing(false);
        }
    };

    // Handle submitting the interpreted AI negotiation proposal as a ChangeRequest
    const handleExecuteAIChanges = async (changes: NegotiationChange[]) => {
        if (!quotation) return;

        setIsExecutingAI(true);
        try {
            for (const ch of changes) {
                await apiClient.post(
                    API_ROUTES.PORTAL.QUOTATIONS.CHANGE_REQUESTS(id),
                    {
                        lineNumber: ch.lineNumber,
                        quantity: ch.type === "LINE_QUANTITY" ? ch.quantity : undefined,
                        discountPercent:
                            ch.type === "LINE_DISCOUNT" ? ch.discountPercent : undefined,
                        message: `Requested via proposal preview: ${
                            ch.type === "LINE_DISCOUNT"
                                ? `${ch.discountPercent}% discount`
                                : `${ch.quantity} qty`
                        } on Line ${ch.lineNumber}`,
                    }
                );
            }

            toast.success(
                "Proposal Submitted for Review",
                "Your proposed commercial adjustments have been submitted for sales review. Active quotation terms remain unchanged."
            );
            setPreviewResult(null);
            refreshData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiClientError
                    ? err.message
                    : "Failed to submit proposal.";
            toast.error("Submission Failed", msg);
        } finally {
            setIsExecutingAI(false);
        }
    };

    // Handle submitting structured change request
    const handleSubmitChangeRequest = async (input: CreateChangeRequestInput) => {
        setIsSubmittingChangeRequest(true);
        try {
            await apiClient.post(
                API_ROUTES.PORTAL.QUOTATIONS.CHANGE_REQUESTS(id),
                input
            );

            toast.success(
                "Change Request Created",
                "Your structured commercial proposal has been submitted to the sales team."
            );
            refreshData();
        } catch (err: unknown) {
            const msg = err instanceof ApiClientError ? err.message : "Failed to submit change request.";
            toast.error("Submission Error", msg);
            throw err;
        } finally {
            setIsSubmittingChangeRequest(false);
        }
    };

    // Open change request modal optionally targeted at a specific line
    const handleOpenChangeRequestModal = (lineNum?: number) => {
        setTargetLineNumber(lineNum);
        setIsChangeRequestModalOpen(true);
    };

    // Handle confirming quotation
    const handleConfirmQuotation = async () => {
        setIsConfirming(true);
        setConfirmError(null);

        try {
            await apiClient.post(
                API_ROUTES.PORTAL.QUOTATIONS.CONFIRM(id),
                {}
            );

            toast.success(
                "Quotation Confirmed!",
                "Commercial agreement finalized. Order is advancing to fulfillment."
            );
            setIsConfirmModalOpen(false);
            refreshData();
        } catch (err: unknown) {
            const msg = err instanceof ApiClientError ? err.message : "Failed to confirm quotation.";
            setConfirmError(msg);
            toast.error("Confirmation Error", msg);
        } finally {
            setIsConfirming(false);
        }
    };

    // Handle Customer Invoice Payment
    const handlePayCustomerInvoice = async () => {
        if (!customerInvoice) return;
        setIsPayingInvoice(true);

        try {
            await apiClient.post<InvoiceResponse>(
                API_ROUTES.INVOICES.PAY(customerInvoice.id),
                {}
            );
            toast.success("Payment Received", "Your invoice payment has been successfully recorded.");
            setIsPayModalOpen(false);
            refreshData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to record invoice payment.";
            toast.error("Payment Failed", msg);
        } finally {
            setIsPayingInvoice(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-48" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (errorMessage || !quotation) {
        return (
            <div className="space-y-6">
                <Link
                    href="/portal/quotations"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1E40AF] hover:underline"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to My Quotations
                </Link>

                <Card className="border-[#FECACA] bg-[#FEF2F2]">
                    <CardContent className="p-6 text-center space-y-3">
                        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
                        <h2 className="text-[16px] font-bold text-[#991B1B]">
                            Unable to Load Quotation
                        </h2>
                        <p className="text-[13px] text-[#B91C1C] max-w-md mx-auto">
                            {errorMessage || "The requested quotation could not be found or you do not have permission to view it."}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsLoading(true);
                                setErrorMessage(null);
                                refreshData();
                            }}
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Authoritative State Flags
    const isConfirmed = quotation.status === "CONFIRMED" || quotation.revision.status === "CONFIRMED";
    const isPendingApproval = quotation.revision.status === "PENDING_APPROVAL";
    const isNegotiable =
        !isConfirmed &&
        (quotation.status === "SENT" || quotation.status === "UNDER_NEGOTIATION");

    // Confirmation Eligibility per backend contract:
    // quotation is not CONFIRMED, revision is not PENDING_APPROVAL, and revision status is APPROVED or SENT
    const canConfirm =
        !isConfirmed &&
        !isPendingApproval &&
        (quotation.revision.status === "APPROVED" || quotation.revision.status === "SENT");

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <Link
                            href="/portal/quotations"
                            className="hover:text-[#0F172A] transition-colors"
                        >
                            Quotations
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-[#0F172A]">
                            {quotation.quoteNumber}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-[22px] font-bold text-[#0F172A]">
                            {quotation.quoteNumber}
                        </h1>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                            Rev {quotation.revision.revisionNumber}
                        </span>
                        <StatusBadge
                            type="quotation"
                            status={quotation.status}
                            size="default"
                        />
                    </div>
                </div>

                {/* Top Quick Actions */}
                <div className="flex items-center gap-2">
                    {canConfirm && (
                        <Button
                            variant="primary"
                            onClick={() => setIsConfirmModalOpen(true)}
                            leftIcon={<CheckCircle2 className="w-4 h-4" />}
                            className="bg-[#059669] hover:bg-[#047857] text-white"
                        >
                            Confirm Order
                        </Button>
                    )}

                    {isNegotiable && (
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChangeRequestModal()}
                            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                        >
                            Propose Changes
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content: Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (Line Items & Discussion Feed) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Line Items Card */}
                    <Card>
                        <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#1E40AF]" />
                                    <CardTitle className="text-[15px] font-bold text-[#0F172A]">
                                        Quotation Line Items
                                    </CardTitle>
                                </div>
                                <span className="text-[12px] text-[#64748B]">
                                    {quotation.revision.lines.length} item{quotation.revision.lines.length === 1 ? "" : "s"}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <PortalQuotationLines
                                lines={quotation.revision.lines}
                                currency="INR"
                                isNegotiable={isNegotiable}
                                onRequestLineChange={(lineNum) => handleOpenChangeRequestModal(lineNum)}
                            />
                        </CardContent>
                    </Card>

                    {/* Active AI Preview Card (if generated) */}
                    {previewResult && (
                        <NegotiationPreviewCard
                            preview={previewResult}
                            currency="INR"
                            isExecuting={isExecutingAI}
                            onExecute={handleExecuteAIChanges}
                            onDismiss={() => setPreviewResult(null)}
                        />
                    )}

                    {/* Commercial Discussion & Proposals Card */}
                    <Card>
                        <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-[15px] font-bold text-[#0F172A]">
                                        Commercial Discussion & History
                                    </CardTitle>
                                    <p className="text-[12px] text-[#64748B] mt-0.5">
                                        Messages and commercial proposals exchanged with your account team.
                                    </p>
                                </div>
                                {negotiation && negotiation.status !== "NO_NEGOTIATION" && (
                                    <Badge variant="info" size="sm">
                                        Active Thread
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4 space-y-4">
                            {/* Negotiation Timeline */}
                            <NegotiationTimeline
                                messages={negotiation?.messages || []}
                                changeRequests={negotiation?.changeRequests || []}
                            />

                            {/* Negotiation Composer */}
                            <div className="pt-2">
                                <NegotiationComposer
                                    isNegotiable={isNegotiable}
                                    isPendingApproval={isPendingApproval}
                                    isConfirmed={isConfirmed}
                                    isSendingMessage={isSendingMessage}
                                    isPreviewing={isPreviewing}
                                    onSendMessage={handleSendMessage}
                                    onPreviewMessage={handlePreviewMessage}
                                    onOpenStructuredModal={() => handleOpenChangeRequestModal()}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (Commercial Summary & Order Status) */}
                <div className="lg:col-span-4 space-y-5">
                    {/* Commercial Summary Card */}
                    <PortalCommercialSummary
                        summary={quotation.revision.summary}
                        orderDiscountPercent={quotation.revision.orderDiscountPercent}
                        currency="INR"
                        status={quotation.status}
                        revisionStatus={quotation.revision.status}
                        revisionNumber={quotation.revision.revisionNumber}
                    />

                    {/* Status & Confirmation Callout Card */}
                    {isConfirmed && (
                        <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] space-y-2">
                            <div className="flex items-center gap-2 text-[#059669]">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span className="font-bold text-[14px]">Order Confirmed</span>
                            </div>
                            <p className="text-[12px] text-[#047857] leading-relaxed">
                                You have confirmed the commercial terms for this quotation. The order is now being processed by our operations and fulfillment team.
                            </p>
                        </div>
                    )}

                    {quotation.status === "UNDER_NEGOTIATION" && (
                        <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
                            <div className="flex items-center gap-2 text-[#D97706]">
                                <Clock className="w-5 h-5 shrink-0" />
                                <span className="font-bold text-[14px]">Negotiation In Progress</span>
                            </div>
                            <p className="text-[12px] text-[#92400E] leading-relaxed">
                                A commercial proposal is currently under review with your account team.
                                The quotation pricing and totals above reflect the currently active terms (Revision {quotation.revision.revisionNumber}). Active terms remain unchanged until new terms are approved and issued by sales.
                            </p>
                        </div>
                    )}

                    {isPendingApproval && quotation.status !== "UNDER_NEGOTIATION" && (
                        <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
                            <div className="flex items-center gap-2 text-[#D97706]">
                                <Clock className="w-5 h-5 shrink-0" />
                                <span className="font-bold text-[14px]">Under Internal Review</span>
                            </div>
                            <p className="text-[12px] text-[#92400E] leading-relaxed">
                                Your requested discount or terms are being reviewed by our sales and finance managers. Once approved, the revised proposal will be ready for your confirmation.
                            </p>
                        </div>
                    )}

                    {canConfirm && (
                        <div className="p-4 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] space-y-3">
                            <div className="flex items-center gap-2 text-[#1E40AF]">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span className="font-bold text-[14px]">Ready for Acceptance</span>
                            </div>
                            <p className="text-[12px] text-[#1E3A8A] leading-relaxed">
                                The current commercial pricing and terms in Revision {quotation.revision.revisionNumber} have been approved. You can now confirm this deal to finalize your order.
                            </p>
                            <Button
                                variant="primary"
                                className="w-full bg-[#059669] hover:bg-[#047857] text-white"
                                onClick={() => setIsConfirmModalOpen(true)}
                                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                            >
                                Confirm Order Now
                            </Button>
                        </div>
                    )}

                    {/* Proposal Action Card */}
                    {isNegotiable && (
                        <Card className="border-[#E2E8F0] shadow-2xs">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-[#1E40AF]" />
                                    <span className="font-bold text-[13px] text-[#0F172A]">
                                        Need Specific Adjustments?
                                    </span>
                                </div>
                                <p className="text-[12px] text-[#64748B] leading-relaxed">
                                    Submit a structured counter-proposal for item volume or discount rates directly to your account representative.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[12px]"
                                    onClick={() => handleOpenChangeRequestModal()}
                                    leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                                >
                                    Propose Commercial Changes
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Customer Invoice Card when confirmed */}
                    {quotation.status === "CONFIRMED" && customerInvoice && (
                        <div className="p-4 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-[#1E40AF]" />
                                    <span className="font-bold text-[13px] text-[#0F172A]">
                                        Invoice {customerInvoice.invoiceNumber}
                                    </span>
                                </div>
                                <StatusBadge type="billing" status={customerInvoice.status} size="sm" />
                            </div>

                            <div className="flex justify-between text-[13px] pt-1">
                                <span className="text-[#64748B]">Total Amount</span>
                                <span className="font-bold text-[#0F172A]">
                                    <FinancialNumeral value={customerInvoice.total} />
                                </span>
                            </div>

                            {customerInvoice.status === "PENDING" && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full text-[12px] bg-[#1E40AF] hover:bg-[#1D4ED8]"
                                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                                    onClick={() => setIsPayModalOpen(true)}
                                >
                                    Pay Invoice Now
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Structured Change Request Modal */}
            {isChangeRequestModalOpen && (
                <ChangeRequestModal
                    isOpen={isChangeRequestModalOpen}
                    onClose={() => setIsChangeRequestModalOpen(false)}
                    lines={quotation.revision.lines}
                    initialLineNumber={targetLineNumber}
                    isSubmitting={isSubmittingChangeRequest}
                    onSubmit={handleSubmitChangeRequest}
                />
            )}

            {/* Quotation Confirmation Modal */}
            <QuotationConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                quoteNumber={quotation.quoteNumber}
                revisionNumber={quotation.revision.revisionNumber}
                total={quotation.revision.summary.total}
                currency="INR"
                isConfirming={isConfirming}
                error={confirmError}
                onConfirm={handleConfirmQuotation}
            />

            {/* Customer Invoice Payment Modal */}
            {isPayModalOpen && customerInvoice && (
                <PaymentModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    invoiceNumber={customerInvoice.invoiceNumber}
                    customerName={customerInvoice.customerName || "Your Account"}
                    total={customerInvoice.total}
                    isPaying={isPayingInvoice}
                    onConfirmPayment={handlePayCustomerInvoice}
                />
            )}
        </div>
    );
}
