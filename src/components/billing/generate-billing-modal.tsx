"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, FileText, Receipt } from "lucide-react";
import type { QuotationListResponse, QuotationCardResponse } from "@/server/modules/quotations/quotation.types";
import type { GenerateBillingResponse } from "@/server/modules/billing/billing.types";

export interface GenerateBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: GenerateBillingResponse) => void;
}

export function GenerateBillingModal({
    isOpen,
    onClose,
    onSuccess,
}: GenerateBillingModalProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [confirmedQuotes, setConfirmedQuotes] = useState<QuotationCardResponse[]>([]);
    const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(false);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch confirmed quotations when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLoadingQuotes(true);
        setErrorMessage(null);
        setSelectedQuoteId("");

        apiClient
            .get<QuotationListResponse>(API_ROUTES.QUOTATIONS.LIST, {
                params: { status: "CONFIRMED", limit: 50 },
            })
            .then((res) => {
                if (isMounted) {
                    setConfirmedQuotes(res.quotations || []);
                    if (res.quotations && res.quotations.length > 0) {
                        setSelectedQuoteId(res.quotations[0].id);
                    }
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load confirmed quotations.";
                    setErrorMessage(msg);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoadingQuotes(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    const selectedQuote = confirmedQuotes.find((q) => q.id === selectedQuoteId);

    const handleGenerate = async () => {
        if (!selectedQuoteId) return;

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            const res = await apiClient.post<GenerateBillingResponse>(
                API_ROUTES.BILLING.GENERATE,
                { quotationId: selectedQuoteId }
            );

            const hasInvoice = Boolean(res.invoice);
            const hasSubs = Boolean(res.subscriptions && res.subscriptions.length > 0);

            if (hasInvoice && hasSubs) {
                toast.success(
                    "Billing Generated",
                    `Created Invoice ${res.invoice?.invoiceNumber} and ${res.subscriptions.length} recurring subscription(s).`
                );
            } else if (hasInvoice) {
                toast.success(
                    "Invoice Created",
                    `Successfully generated Invoice ${res.invoice?.invoiceNumber}.`
                );
            } else if (hasSubs) {
                toast.success(
                    "Subscriptions Created",
                    `Successfully created ${res.subscriptions.length} recurring subscription(s).`
                );
            } else {
                toast.success("Billing Generated", "Quotation billing records processed.");
            }

            onClose();

            if (onSuccess) {
                onSuccess(res);
            }

            // Route logically based on backend response shape
            if (res.invoice?.id) {
                router.push(`/billing/${res.invoice.id}`);
            } else if (res.subscriptions && res.subscriptions.length > 0) {
                router.push(`/subscriptions/${res.subscriptions[0].id}`);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to generate billing.";
            setErrorMessage(msg);
            toast.error("Generation Failed", msg);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#1E40AF]" />
                    <span>Generate Billing from Confirmed Quotation</span>
                </div>
            }
            description="Convert an authoritative confirmed quotation revision into formal billing invoice and/or recurring subscriptions."
            footer={
                <>
                    <Button
                        variant="outline"
                        size="default"
                        disabled={isGenerating}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="default"
                        isLoading={isGenerating}
                        disabled={!selectedQuoteId || isGenerating || isLoadingQuotes}
                        onClick={handleGenerate}
                    >
                        Generate Billing
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {errorMessage && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#0F172A]">
                        Select Confirmed Quotation
                    </label>
                    {isLoadingQuotes ? (
                        <div className="text-[13px] text-[#64748B] py-2">
                            Loading eligible confirmed quotations...
                        </div>
                    ) : confirmedQuotes.length === 0 ? (
                        <div className="p-3 text-[13px] text-[#64748B] rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                            No confirmed quotations available for billing generation.
                        </div>
                    ) : (
                        <Select
                            value={selectedQuoteId}
                            onChange={(e) => setSelectedQuoteId(e.target.value)}
                            options={confirmedQuotes.map((q) => ({
                                value: q.id,
                                label: `${q.quoteNumber} — ${q.customer.name}`,
                            }))}
                        />
                    )}
                </div>

                {selectedQuote && (
                    <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[13px]">
                        <div className="flex justify-between text-[#64748B]">
                            <span>Customer</span>
                            <span className="font-semibold text-[#0F172A]">
                                {selectedQuote.customer.name}
                            </span>
                        </div>
                        <div className="flex justify-between text-[#64748B]">
                            <span>Quotation Reference</span>
                            <span className="font-mono font-medium text-[#0F172A]">
                                {selectedQuote.quoteNumber}
                            </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E2E8F0] font-semibold text-[#0F172A]">
                            <span>Quotation Total</span>
                            <span className="text-[#1E40AF]">
                                <FinancialNumeral value={selectedQuote.total} />
                            </span>
                        </div>
                    </div>
                )}

                <p className="text-[12px] text-[#64748B] leading-relaxed">
                    Note: Backend partitions one-time line items into an Invoice and recurring subscription line items into active Subscriptions grouped by cadence interval.
                </p>
            </div>
        </Modal>
    );
}
