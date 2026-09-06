"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { CustomerContextCard } from "@/components/quotations/customer-context-card";
import { CustomerNegotiationCard } from "@/components/quotations/customer-negotiation-card";
import { CommercialSummaryCard } from "@/components/quotations/commercial-summary-card";
import { GovernancePanel } from "@/components/quotations/governance-panel";
import { DealLifecycleBanner } from "@/components/quotations/deal-lifecycle-banner";
import { DealIntelligenceSection } from "@/components/quotations/DealIntelligenceSection";
import { DealCopilot } from "@/components/quotations/DealCopilot";
import {
    AddLineModal,
    type NewQuotationLineData,
} from "@/components/quotations/add-line-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
    QUOTATION_MANAGE_ROLES,
    FULFILLMENT_CREATE_ROLES,
    BILLING_GENERATE_ROLES,
} from "@/lib/constants";
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    Check,
    Package,
    Plus,
    Receipt,
    Repeat,
    Save,
    Send,
    Trash2,
    Truck,
} from "lucide-react";
import type {
    CanonicalQuotationResponse,
    QuotationLineResponse,
    SubmitQuotationResponse,
} from "@/server/modules/quotations/quotation.types";
import type {
    CanonicalFulfillmentResponse,
    FulfillmentListResponse,
    FulfillmentSummaryResponse,
} from "@/server/modules/fulfillment/fulfillment.types";
import type {
    InvoiceListResponse,
    InvoiceSummaryResponse,
    SubscriptionListResponse,
    SubscriptionSummaryResponse,
    GenerateBillingResponse,
} from "@/server/modules/billing/billing.types";

interface QuotationDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function QuotationDetailPage({ params }: QuotationDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // Authoritative Quotation data
    const [quotation, setQuotation] = useState<CanonicalQuotationResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Fulfillment State
    const [existingFulfillment, setExistingFulfillment] = useState<FulfillmentSummaryResponse | null>(null);
    const [isCreatingFulfillment, setIsCreatingFulfillment] = useState<boolean>(false);

    // Billing & Subscription State
    const [existingInvoice, setExistingInvoice] = useState<InvoiceSummaryResponse | null>(null);
    const [existingSubscriptions, setExistingSubscriptions] = useState<SubscriptionSummaryResponse[]>([]);
    const [isGeneratingBilling, setIsGeneratingBilling] = useState<boolean>(false);

    // Editable Draft State
    const [draftLines, setDraftLines] = useState<QuotationLineResponse[]>([]);
    const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
    const [isDirty, setIsDirty] = useState<boolean>(false);

    // Live Authoritative Preview State (from POST /api/quotations/:id/preview)
    const [previewQuotation, setPreviewQuotation] = useState<CanonicalQuotationResponse | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

    // Command Actions State
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // Modals & Panels
    const [isAddLineModalOpen, setIsAddLineModalOpen] = useState<boolean>(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

    const isDraft = quotation?.status === "DRAFT";
    const canSendQuotation =
        (quotation?.status === "APPROVED" || quotation?.status === "UNDER_NEGOTIATION") &&
        quotation?.revision?.status === "APPROVED";
    const canManageQuotation =
        currentUser && QUOTATION_MANAGE_ROLES.includes(currentUser.role);
    const canCreateFulfillment =
        Boolean(currentUser && (FULFILLMENT_CREATE_ROLES as readonly string[]).includes(currentUser.role));
    const canGenerateBilling =
        Boolean(currentUser && (BILLING_GENERATE_ROLES as readonly string[]).includes(currentUser.role));

    // Warn on tab close / reload if there are unsaved modifications
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Initial Load: Fetch Canonical Quotation
    useEffect(() => {
        let isMounted = true;

        async function fetchQuotation() {
            try {
                const data = await apiClient.get<CanonicalQuotationResponse>(
                    API_ROUTES.QUOTATIONS.BY_ID(id)
                );

                if (isMounted) {
                    setQuotation(data);
                    setPreviewQuotation(data);
                    setDraftLines(data.revision.lines || []);
                    setOrderDiscountPercent(data.revision.orderDiscountPercent || 0);
                    setIsDirty(false);
                    setErrorMessage(null);
                    setIsLoading(false);

                    // If Confirmed: fetch existing fulfillment, invoice, and subscriptions for UX button optimization
                    if (data.status === "CONFIRMED") {
                        apiClient
                            .get<FulfillmentListResponse>(API_ROUTES.FULFILLMENTS.LIST, {
                                params: { quotationId: id },
                            })
                            .then((fRes) => {
                                if (isMounted && fRes.fulfillments && fRes.fulfillments.length > 0) {
                                    setExistingFulfillment(fRes.fulfillments[0]);
                                }
                            })
                            .catch(() => {});

                        apiClient
                            .get<InvoiceListResponse>(API_ROUTES.INVOICES.LIST, {
                                params: { quotationId: id },
                            })
                            .then((iRes) => {
                                if (isMounted && iRes.invoices && iRes.invoices.length > 0) {
                                    setExistingInvoice(iRes.invoices[0]);
                                }
                            })
                            .catch(() => {});

                        apiClient
                            .get<SubscriptionListResponse>(API_ROUTES.SUBSCRIPTIONS.LIST, {
                                params: { quotationId: id },
                            })
                            .then((sRes) => {
                                if (isMounted && sRes.subscriptions && sRes.subscriptions.length > 0) {
                                    setExistingSubscriptions(sRes.subscriptions);
                                }
                            })
                            .catch(() => {});
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Quotation not found or failed to load.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        fetchQuotation();

        return () => {
            isMounted = false;
        };
    }, [id, refreshTrigger]);

    // Debounced Live Preview: triggers POST /api/quotations/:id/preview when draftLines or orderDiscountPercent change
    useEffect(() => {
        if (!isDraft || !isDirty || !quotation) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsPreviewLoading(true);
            try {
                const payload = {
                    lines: draftLines.map((l) => ({
                        lineNumber: l.lineNumber,
                        productId: l.productId,
                        variantId: l.variantId || null,
                        quantity: Math.max(1, Math.round(Number(l.quantity) || 1)),
                        discountPercent: Number(Number(l.discountPercent || 0).toFixed(2)),
                    })),
                    orderDiscountPercent: Number(Number(orderDiscountPercent || 0).toFixed(2)),
                };

                const previewData = await apiClient.post<CanonicalQuotationResponse>(
                    API_ROUTES.QUOTATIONS.PREVIEW(id),
                    payload
                );

                if (isMounted) {
                    setPreviewQuotation(previewData);
                    setIsPreviewLoading(false);
                }
            } catch (err) {
                console.error("Quotation preview calculation failed:", err);
                if (isMounted) {
                    setIsPreviewLoading(false);
                }
            }
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isDraft, isDirty, draftLines, orderDiscountPercent, id, quotation]);

    // Line Operations (Mutates Local Draft State Only)
    const handleAddLine = (item: NewQuotationLineData) => {
        const nextLineNumber =
            draftLines.length > 0
                ? Math.max(...draftLines.map((l) => l.lineNumber)) + 1
                : 1;

        const subtotal = item.quantity * item.unitPrice;
        const discountAmount = (subtotal * item.discountPercent) / 100;
        const total = subtotal - discountAmount;
        const cost = item.quantity * item.unitCost;
        const margin = total - cost;
        const marginPercent = total > 0 ? (margin / total) * 100 : 0;

        const newLine: QuotationLineResponse = {
            lineNumber: nextLineNumber,
            productId: item.productId,
            variantId: item.variantId || null,
            name: item.name,
            sku: item.sku || null,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            discountPercent: item.discountPercent,
            lineSubtotal: subtotal,
            lineDiscount: discountAmount,
            lineTotal: total,
            margin,
            marginPercent,
        };

        setDraftLines((prev) => [...prev, newLine]);
        setIsDirty(true);
    };

    const handleQuantityChange = (lineNumber: number, newQtyStr: string) => {
        const parsed = parseInt(newQtyStr, 10);
        const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;

        setDraftLines((prev) =>
            prev.map((line) => {
                if (line.lineNumber !== lineNumber) return line;
                return { ...line, quantity: qty };
            })
        );
        setIsDirty(true);
    };

    const handleDiscountChange = (lineNumber: number, newDiscountStr: string) => {
        const parsed = parseFloat(newDiscountStr);
        const discount = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));

        setDraftLines((prev) =>
            prev.map((line) => {
                if (line.lineNumber !== lineNumber) return line;
                return { ...line, discountPercent: discount };
            })
        );
        setIsDirty(true);
    };

    const handleRemoveLine = (lineNumber: number) => {
        setDraftLines((prev) => prev.filter((line) => line.lineNumber !== lineNumber));
        setIsDirty(true);
    };

    const handleOrderDiscountChange = (percent: number) => {
        setOrderDiscountPercent(percent);
        setIsDirty(true);
    };

    // Domain Action: Save Draft (PUT /api/quotations/:id/draft)
    const handleSaveDraft = async () => {
        if (!isDraft) return;

        setIsSaving(true);
        setSubmissionError(null);

        try {
            const payload = {
                lines: draftLines.map((l) => ({
                    lineNumber: l.lineNumber,
                    productId: l.productId,
                    variantId: l.variantId || null,
                    quantity: Math.max(1, Math.round(Number(l.quantity) || 1)),
                    discountPercent: Number(Number(l.discountPercent || 0).toFixed(2)),
                })),
                orderDiscountPercent: Number(Number(orderDiscountPercent || 0).toFixed(2)),
            };

            const savedQuotation = await apiClient.put<CanonicalQuotationResponse>(
                API_ROUTES.QUOTATIONS.SAVE_DRAFT(id),
                payload
            );

            setQuotation(savedQuotation);
            setPreviewQuotation(savedQuotation);
            setDraftLines(savedQuotation.revision.lines || []);
            setOrderDiscountPercent(savedQuotation.revision.orderDiscountPercent || 0);
            setIsDirty(false);

            toast.success("Draft Saved", "Quotation line items and commercial terms persisted.");
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to save quotation draft.";
            toast.error("Save Failed", msg);
        } finally {
            setIsSaving(false);
        }
    };

    // Domain Action: Submit Quotation (POST /api/quotations/:id/submit)
    const handleSubmitQuotation = async () => {
        if (!isDraft) return;

        if (draftLines.length === 0) {
            toast.error("Cannot Submit", "Please add at least one line item before submitting.");
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            // If there are unsaved local modifications, save them first
            if (isDirty) {
                const savePayload = {
                    lines: draftLines.map((l) => ({
                        lineNumber: l.lineNumber,
                        productId: l.productId,
                        variantId: l.variantId || null,
                        quantity: l.quantity,
                        discountPercent: l.discountPercent,
                    })),
                    orderDiscountPercent,
                };
                await apiClient.put<CanonicalQuotationResponse>(
                    API_ROUTES.QUOTATIONS.SAVE_DRAFT(id),
                    savePayload
                );
            }

            const response = await apiClient.post<SubmitQuotationResponse>(
                API_ROUTES.QUOTATIONS.SUBMIT(id)
            );

            if (response.status === "APPROVED") {
                toast.success(
                    "Quotation Approved",
                    "Discounts are within policy limits. The quote is approved automatically."
                );
            } else if (response.status === "PENDING_APPROVAL") {
                const levelName = response.approvalLevel
                    ? response.approvalLevel.replace(/_/g, " ")
                    : "Management";
                toast.warning(
                    "Submitted for Approval",
                    `Quotation requires ${levelName} review before it can be sent.`
                );
            }

            // Refresh authoritative state from backend
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Submission rejected by governance.";
            setSubmissionError(msg);
            toast.error("Submission Rejected", msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Domain Action: Send Quotation (POST /api/quotations/:id/send)
    const handleSendQuotation = async () => {
        if (!canSendQuotation) return;

        setIsSending(true);

        try {
            const updated = await apiClient.post<CanonicalQuotationResponse>(
                API_ROUTES.QUOTATIONS.SEND(id)
            );

            setQuotation(updated);
            setPreviewQuotation(updated);
            toast.success(
                "Quotation Sent",
                "Proposal has been delivered to customer and is now active in the portal."
            );
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to send quotation.";
            toast.error("Send Failed", msg);
        } finally {
            setIsSending(false);
        }
    };

    // Domain Action: Create Fulfillment (POST /api/fulfillments)
    const handleCreateFulfillment = async () => {
        setIsCreatingFulfillment(true);

        try {
            const fulfillment = await apiClient.post<CanonicalFulfillmentResponse>(
                API_ROUTES.FULFILLMENTS.CREATE,
                { quotationId: id }
            );

            toast.success(
                "Fulfillment Created",
                `Successfully created fulfillment order ${fulfillment.fulfillmentNumber}.`
            );
            router.push(`/fulfillment/${fulfillment.id}`);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to create fulfillment.";

            // If 409 Conflict: fetch existing fulfillment and route user to it
            if (
                msg.toLowerCase().includes("already exists") ||
                (err as { status?: number })?.status === 409
            ) {
                try {
                    const existingList = await apiClient.get<FulfillmentListResponse>(
                        API_ROUTES.FULFILLMENTS.LIST,
                        { params: { quotationId: id } }
                    );

                    if (existingList.fulfillments && existingList.fulfillments.length > 0) {
                        const existing = existingList.fulfillments[0];
                        setExistingFulfillment(existing);
                        toast.info(
                            "Fulfillment Exists",
                            `A fulfillment order already exists (${existing.fulfillmentNumber}). Opening fulfillment...`
                        );
                        router.push(`/fulfillment/${existing.id}`);
                        return;
                    }
                } catch {
                    // Fall through to error toast
                }
            }

            toast.error("Fulfillment Creation Failed", msg);
        } finally {
            setIsCreatingFulfillment(false);
        }
    };

    // Domain Action: Generate Billing (POST /api/billing)
    const handleGenerateBilling = async () => {
        setIsGeneratingBilling(true);

        try {
            const res = await apiClient.post<GenerateBillingResponse>(
                API_ROUTES.BILLING.GENERATE,
                { quotationId: id }
            );

            const hasInvoice = Boolean(res.invoice);
            const hasSubs = Boolean(res.subscriptions && res.subscriptions.length > 0);

            if (hasInvoice && hasSubs) {
                toast.success(
                    "Billing Generated",
                    `Created Invoice ${res.invoice?.invoiceNumber} and ${res.subscriptions.length} recurring subscription(s).`
                );
                router.push(`/billing/${res.invoice?.id}`);
            } else if (hasInvoice && res.invoice) {
                toast.success(
                    "Invoice Generated",
                    `Created Invoice ${res.invoice.invoiceNumber}.`
                );
                router.push(`/billing/${res.invoice.id}`);
            } else if (hasSubs && res.subscriptions[0]) {
                toast.success(
                    "Subscription Generated",
                    `Created recurring subscription ${res.subscriptions[0].subscriptionNumber}.`
                );
                router.push(`/subscriptions/${res.subscriptions[0].id}`);
            } else {
                toast.success("Billing Processed", "Billing generated successfully.");
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to generate billing.";

            // Handle 409 Conflict: refresh existing billing records and route to invoice if available
            if (
                msg.toLowerCase().includes("already") ||
                (err as { status?: number })?.status === 409
            ) {
                try {
                    const existingList = await apiClient.get<InvoiceListResponse>(
                        API_ROUTES.INVOICES.LIST,
                        { params: { quotationId: id } }
                    );
                    if (existingList.invoices && existingList.invoices.length > 0) {
                        const existing = existingList.invoices[0];
                        setExistingInvoice(existing);
                        toast.info(
                            "Billing Exists",
                            `Billing already generated (${existing.invoiceNumber}). Opening invoice...`
                        );
                        router.push(`/billing/${existing.id}`);
                        return;
                    }
                } catch {
                    // Fall through
                }
            }

            toast.error("Billing Generation Failed", msg);
        } finally {
            setIsGeneratingBilling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2 pb-4 border-b border-[#E2E8F0]">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-64" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-32" />
                        </div>
                    </div>
                </div>
                <div className="h-20 bg-[#E2E8F0] rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-[#E2E8F0] rounded-lg animate-pulse" />
                    <div className="space-y-4">
                        <div className="h-64 bg-[#E2E8F0] rounded-lg animate-pulse" />
                        <div className="h-36 bg-[#E2E8F0] rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (errorMessage || !quotation) {
        return (
            <div className="space-y-6">
                <Link
                    href="/quotations"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Quotations
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Quotation Not Found"
                            message={errorMessage || "The requested deal workspace could not be loaded."}
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

    // Authoritative rendered state comes from previewQuotation (or persisted quotation)
    const currentRevision = previewQuotation?.revision ?? quotation.revision;
    const currentSummary = currentRevision.summary;
    const currentEvaluation = currentRevision.evaluation;
    const displayLines = isDraft
        ? draftLines.map((draftLine) => {
              // Match authoritative preview calculations for this lineNumber if available
              const previewMatch = previewQuotation?.revision.lines.find(
                  (pl) => pl.lineNumber === draftLine.lineNumber
              );
              if (!previewMatch) return draftLine;
              return {
                  ...previewMatch,
                  quantity: draftLine.quantity,
                  discountPercent: draftLine.discountPercent,
              };
          })
        : currentRevision.lines;

    return (
        <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div>
                <Link
                    href="/quotations"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Quotations
                </Link>
            </div>

            {/* Deal Workspace Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-[22px] leading-[28px] font-bold text-[#0F172A]">
                            {quotation.quoteNumber}
                        </h1>
                        <Badge variant="neutral" size="default">
                            Revision {currentRevision.revisionNumber}
                        </Badge>
                        <StatusBadge type="quotation" status={quotation.status} />
                        {isDirty && (
                            <Badge variant="warning" dot size="default">
                                Unsaved Changes
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[#64748B] mt-1 flex-wrap">
                        <span>Customer: <strong className="text-[#0F172A]">{quotation.customer.name}</strong></span>
                        <span>•</span>
                        <span>Revision Status: <strong className="text-[#0F172A]">{currentRevision.status}</strong></span>
                    </div>
                </div>

                {/* Header Action Commands */}
                <div className="flex items-center gap-2">
                    {isDraft && canManageQuotation && (
                        <>
                            <Button
                                variant="outline"
                                size="default"
                                leftIcon={<Save className="w-4 h-4" />}
                                isLoading={isSaving}
                                disabled={!isDirty || isSaving}
                                onClick={handleSaveDraft}
                            >
                                Save Draft
                            </Button>

                            <Button
                                variant="primary"
                                size="default"
                                leftIcon={<Check className="w-4 h-4" />}
                                isLoading={isSubmitting}
                                disabled={draftLines.length === 0 || isSubmitting}
                                onClick={handleSubmitQuotation}
                            >
                                Submit Quote
                            </Button>
                        </>
                    )}

                    {canSendQuotation && canManageQuotation && (
                        <Button
                            variant="primary"
                            size="default"
                            leftIcon={<Send className="w-4 h-4" />}
                            isLoading={isSending}
                            disabled={isSending}
                            onClick={handleSendQuotation}
                        >
                            Send Quotation
                        </Button>
                    )}

                    {quotation.status === "CONFIRMED" && (
                        <>
                            {existingInvoice ? (
                                <Link href={`/billing/${existingInvoice.id}`}>
                                    <Button
                                        variant="outline"
                                        size="default"
                                        leftIcon={<Receipt className="w-4 h-4" />}
                                    >
                                        View Invoice ({existingInvoice.invoiceNumber})
                                    </Button>
                                </Link>
                            ) : existingSubscriptions.length > 0 ? (
                                <Link href={`/subscriptions/${existingSubscriptions[0].id}`}>
                                    <Button
                                        variant="outline"
                                        size="default"
                                        leftIcon={<Repeat className="w-4 h-4" />}
                                    >
                                        View Subscription ({existingSubscriptions[0].subscriptionNumber})
                                    </Button>
                                </Link>
                            ) : canGenerateBilling ? (
                                <Button
                                    variant="outline"
                                    size="default"
                                    leftIcon={<Receipt className="w-4 h-4" />}
                                    isLoading={isGeneratingBilling}
                                    disabled={isGeneratingBilling}
                                    onClick={handleGenerateBilling}
                                >
                                    Generate Billing
                                </Button>
                            ) : null}

                            {existingFulfillment ? (
                                <Link href={`/fulfillment/${existingFulfillment.id}`}>
                                    <Button
                                        variant="primary"
                                        size="default"
                                        leftIcon={<Truck className="w-4 h-4" />}
                                    >
                                        View Fulfillment ({existingFulfillment.fulfillmentNumber})
                                    </Button>
                                </Link>
                            ) : canCreateFulfillment ? (
                                <Button
                                    variant="primary"
                                    size="default"
                                    leftIcon={<Truck className="w-4 h-4" />}
                                    isLoading={isCreatingFulfillment}
                                    disabled={isCreatingFulfillment}
                                    onClick={handleCreateFulfillment}
                                >
                                    Create Fulfillment
                                </Button>
                            ) : null}
                        </>
                    )}

                    {/* AI Deal Copilot Action Trigger */}
                    {currentUser && currentUser.role !== "CUSTOMER" && (
                        <Button
                            variant="outline"
                            size="default"
                            leftIcon={<Bot className="w-4 h-4 text-[#1E40AF]" />}
                            onClick={() => setIsCopilotOpen(true)}
                            className="border-[#BFDBFE] bg-[#EFF6FF]/60 hover:bg-[#EFF6FF] text-[#1E40AF] font-medium"
                        >
                            Deal Copilot
                        </Button>
                    )}
                </div>
            </div>

            {/* Submission Error Banner if rejected */}
            {submissionError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block">Submission Rejected by Discount Governance:</strong>
                        <span>{submissionError}</span>
                    </div>
                </div>
            )}

            {/* Lifecycle Status & Unsaved Guidance Banner */}
            <DealLifecycleBanner
                status={quotation.status}
                isDirty={isDirty}
                approvalLevel={currentEvaluation?.approvalLevel}
            />

            {/* Customer Context Card */}
            <CustomerContextCard customer={quotation.customer} />

            {/* Deal Intelligence V1 Section */}
            <DealIntelligenceSection
                quotationId={id}
                refreshTrigger={refreshTrigger}
            />

            {/* Main Deal Workspace Layout (2 columns: Lines Table vs Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Line Items Table */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Customer Negotiation Request Panel */}
                    <CustomerNegotiationCard
                        quotation={quotation}
                        canManage={Boolean(canManageQuotation)}
                        onNegotiationUpdated={() => setRefreshTrigger((prev) => prev + 1)}
                    />

                    <Card className="border-[#E2E8F0]">
                        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#64748B]" />
                                    Quotation Line Items
                                </CardTitle>
                                <span className="text-[11px] text-[#64748B]">
                                    {displayLines.length} item{displayLines.length !== 1 ? "s" : ""} in revision {currentRevision.revisionNumber}
                                    {isPreviewLoading && " • Recalculating preview..."}
                                </span>
                            </div>

                            {isDraft && canManageQuotation && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={() => setIsAddLineModalOpen(true)}
                                >
                                    Add Product
                                </Button>
                            )}
                        </CardHeader>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="min-w-[200px]">Product / SKU</TableHead>
                                        <TableHead className="w-[85px]">Quantity</TableHead>
                                        <TableHead className="w-[110px] text-right">Unit Price</TableHead>
                                        <TableHead className="w-[110px] text-right">Discount</TableHead>
                                        <TableHead className="w-[110px] text-right">Line Total</TableHead>
                                        <TableHead className="w-[85px] text-right">Margin</TableHead>
                                        {isDraft && canManageQuotation && (
                                            <TableHead className="w-[45px] text-right" />
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayLines.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={isDraft && canManageQuotation ? 8 : 7}
                                                className="py-12 text-center"
                                            >
                                                <EmptyState
                                                    icon={<Package className="w-9 h-9 text-[#94A3B8]" />}
                                                    title="No products added yet"
                                                    description="Add products or services from the catalog to configure commercial pricing, quantities, and discounts."
                                                    action={
                                                        isDraft && canManageQuotation ? (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                                onClick={() => setIsAddLineModalOpen(true)}
                                                            >
                                                                Add First Product
                                                            </Button>
                                                        ) : undefined
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayLines.map((line) => {
                                            const hasLineGovernanceWarning =
                                                line.evaluation &&
                                                line.evaluation.status !== "WITHIN_LIMIT";

                                            return (
                                                <TableRow key={line.lineNumber} className="hover:bg-[#F8FAFC]">
                                                    {/* Line Number */}
                                                    <TableCell className="font-mono text-[11px] text-[#64748B]">
                                                        {line.lineNumber}
                                                    </TableCell>

                                                    {/* Product Name & SKU */}
                                                    <TableCell>
                                                        <div className="min-w-0">
                                                            <span className="font-medium text-[13px] text-[#0F172A] block truncate">
                                                                {line.name}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                                                                <span className="truncate">{line.category}</span>
                                                                {line.sku && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <code className="font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#475569]">
                                                                            {line.sku}
                                                                        </code>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Quantity */}
                                                    <TableCell>
                                                        {isDraft && canManageQuotation ? (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                value={line.quantity}
                                                                onChange={(e) =>
                                                                    handleQuantityChange(
                                                                        line.lineNumber,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="w-16 h-7 text-[12px] text-right font-medium rounded border border-[#CBD5E1] px-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E40AF] tabular-nums"
                                                            />
                                                        ) : (
                                                            <span className="text-[12px] font-medium text-[#0F172A] tabular-nums">
                                                                {line.quantity}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Unit Price */}
                                                    <TableCell className="text-right">
                                                        <FinancialNumeral
                                                            amount={line.unitPrice}
                                                            variant="body"
                                                        />
                                                    </TableCell>

                                                    {/* Discount % with Line Governance Alert */}
                                                    <TableCell className="text-right">
                                                        {isDraft && canManageQuotation ? (
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.5"
                                                                        value={line.discountPercent}
                                                                        onChange={(e) =>
                                                                            handleDiscountChange(
                                                                                line.lineNumber,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="w-16 h-7 text-[12px] text-right font-medium rounded border border-[#CBD5E1] px-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E40AF] tabular-nums"
                                                                    />
                                                                    <span className="text-[11px] text-[#64748B]">%</span>
                                                                </div>
                                                                {hasLineGovernanceWarning && (
                                                                    <span
                                                                        className="text-[10px] text-[#B45309] font-medium mt-1 text-right max-w-[140px] leading-tight"
                                                                        title={line.evaluation?.message || "Approval required"}
                                                                    >
                                                                        ⚠ {line.evaluation?.approvalLevel === "FINANCE_OPERATIONS" ? "Finance" : "Manager"} approval
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-right">
                                                                <span className="text-[12px] tabular-nums text-[#0F172A]">
                                                                    {line.discountPercent}%
                                                                </span>
                                                                {hasLineGovernanceWarning && (
                                                                    <span className="text-[10px] text-[#B45309] block">
                                                                        Approval req.
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    {/* Line Total */}
                                                    <TableCell className="text-right">
                                                        <FinancialNumeral
                                                            amount={line.lineTotal}
                                                            variant="subtotal"
                                                        />
                                                    </TableCell>

                                                    {/* Margin % */}
                                                    <TableCell className="text-right">
                                                        <span
                                                            className={`text-[12px] font-medium tabular-nums ${
                                                                line.margin < 0
                                                                    ? "text-[#B91C1C]"
                                                                    : line.marginPercent < 20
                                                                    ? "text-[#B45309]"
                                                                    : "text-[#047857]"
                                                            }`}
                                                        >
                                                            {line.marginPercent.toFixed(1)}%
                                                        </span>
                                                    </TableCell>

                                                    {/* Actions (Draft Delete) */}
                                                    {isDraft && canManageQuotation && (
                                                        <TableCell className="text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveLine(line.lineNumber)}
                                                                className="text-[#94A3B8] hover:text-[#B91C1C] transition-colors p-1 rounded hover:bg-[#FEF2F2]"
                                                                title="Remove line item"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Commercial Summary & Governance Panels */}
                <div className="space-y-4">
                    <CommercialSummaryCard
                        summary={currentSummary}
                        orderDiscountPercent={orderDiscountPercent}
                        onOrderDiscountChange={handleOrderDiscountChange}
                        isReadOnly={!isDraft || !canManageQuotation}
                    />

                    <GovernancePanel evaluation={currentEvaluation} />
                </div>
            </div>

            {/* Add Line Item Modal */}
            <AddLineModal
                isOpen={isAddLineModalOpen}
                onClose={() => setIsAddLineModalOpen(false)}
                onAddLine={handleAddLine}
            />

            {/* AI Deal Copilot Drawer */}
            <DealCopilot
                quotationId={id}
                quoteNumber={quotation.quoteNumber}
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
            />
        </div>
    );
}
