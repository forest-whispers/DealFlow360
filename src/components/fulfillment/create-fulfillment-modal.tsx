"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { AlertCircle, ExternalLink, Package, Truck } from "lucide-react";
import type {
    QuotationCardResponse,
    QuotationListResponse,
} from "@/server/modules/quotations/quotation.types";
import type {
    CanonicalFulfillmentResponse,
    FulfillmentListResponse,
} from "@/server/modules/fulfillment/fulfillment.types";

export interface CreateFulfillmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (fulfillment: CanonicalFulfillmentResponse) => void;
    initialQuotationId?: string;
}

export function CreateFulfillmentModal({
    isOpen,
    onClose,
    onSuccess,
    initialQuotationId,
}: CreateFulfillmentModalProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [quotations, setQuotations] = useState<QuotationCardResponse[]>([]);
    const [isLoadingQuotations, setIsLoadingQuotations] = useState<boolean>(false);
    const [selectedQuotationId, setSelectedQuotationId] = useState<string>(
        initialQuotationId || ""
    );
    const [manualQuotationId, setManualQuotationId] = useState<string>("");
    const [useManualInput, setUseManualInput] = useState<boolean>(false);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [existingFulfillmentId, setExistingFulfillmentId] = useState<string | null>(null);

    // Fetch candidate confirmed quotations for UX convenience when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setErrorMessage(null);
            setExistingFulfillmentId(null);
            if (initialQuotationId) {
                setSelectedQuotationId(initialQuotationId);
            }
            setIsLoadingQuotations(true);

            try {
                const res = await apiClient.get<QuotationListResponse>(
                    API_ROUTES.QUOTATIONS.LIST,
                    { params: { status: "CONFIRMED", limit: 50 } }
                );

                if (isMounted) {
                    const list = res.quotations || [];
                    setQuotations(list);
                    if (!initialQuotationId && list.length > 0) {
                        setSelectedQuotationId((prev) => prev || list[0].id);
                    }
                }
            } catch {
                // If listing fails, manual entry is still accessible
            } finally {
                if (isMounted) {
                    setIsLoadingQuotations(false);
                }
            }
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isOpen, initialQuotationId]);

    const activeQuotationId = useManualInput
        ? manualQuotationId.trim()
        : selectedQuotationId.trim();

    const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeQuotationId) {
            setErrorMessage("Please select or enter a valid quotation ID.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);
        setExistingFulfillmentId(null);

        try {
            const fulfillment = await apiClient.post<CanonicalFulfillmentResponse>(
                API_ROUTES.FULFILLMENTS.CREATE,
                { quotationId: activeQuotationId }
            );

            toast.success(
                "Fulfillment Created",
                `Successfully created ${fulfillment.fulfillmentNumber} for Quote ${fulfillment.quotationNumber}.`
            );

            onClose();
            if (onSuccess) {
                onSuccess(fulfillment);
            } else {
                router.push(`/fulfillment/${fulfillment.id}`);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to create fulfillment order.";

            // If 409 Conflict: check if a fulfillment already exists and help navigate to it
            if (
                msg.toLowerCase().includes("already exists") ||
                (err as { status?: number })?.status === 409
            ) {
                try {
                    const existingList = await apiClient.get<FulfillmentListResponse>(
                        API_ROUTES.FULFILLMENTS.LIST,
                        { params: { quotationId: activeQuotationId } }
                    );

                    if (existingList.fulfillments && existingList.fulfillments.length > 0) {
                        const existing = existingList.fulfillments[0];
                        setExistingFulfillmentId(existing.id);
                        setErrorMessage(
                            `A fulfillment order already exists for this quotation: ${existing.fulfillmentNumber}.`
                        );
                        return;
                    }
                } catch {
                    // Fallback to error message
                }
            }

            setErrorMessage(msg);
            toast.error("Fulfillment Creation Failed", msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#1E40AF]" />
                    <span>Initiate Deal Fulfillment</span>
                </div>
            }
            description="Create an authoritative fulfillment order and allocate inventory across warehouses for a confirmed quotation."
            maxWidth="lg"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div>
                        {existingFulfillmentId ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="default"
                                leftIcon={<ExternalLink className="w-4 h-4" />}
                                onClick={() => {
                                    onClose();
                                    router.push(`/fulfillment/${existingFulfillmentId}`);
                                }}
                            >
                                Open Existing Fulfillment
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                size="default"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="primary"
                        size="default"
                        isLoading={isSubmitting}
                        disabled={!activeQuotationId || isSubmitting || Boolean(existingFulfillmentId)}
                        onClick={handleSubmit}
                        leftIcon={<Package className="w-4 h-4" />}
                    >
                        Allocate & Fulfill
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* Error Banner */}
                {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold">Backend Allocation Notice:</strong>
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* Selection Mode Switch */}
                <div className="flex items-center justify-between pb-1">
                    <label className="text-[13px] font-medium text-[#0F172A]">
                        Select Confirmed Deal
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setUseManualInput(!useManualInput);
                            setErrorMessage(null);
                        }}
                        className="text-[11px] text-[#1E40AF] hover:underline cursor-pointer"
                    >
                        {useManualInput
                            ? "Pick from confirmed list"
                            : "Enter Quotation ID manually"}
                    </button>
                </div>

                {!useManualInput ? (
                    <div className="space-y-2">
                        {isLoadingQuotations ? (
                            <div className="h-9 bg-[#F1F5F9] rounded-md animate-pulse" />
                        ) : quotations.length > 0 ? (
                            <Select
                                value={selectedQuotationId}
                                onChange={(e) => {
                                    setSelectedQuotationId(e.target.value);
                                    setErrorMessage(null);
                                    setExistingFulfillmentId(null);
                                }}
                            >
                                {quotations.map((q) => (
                                    <option key={q.id} value={q.id}>
                                        {q.quoteNumber} — {q.customer.name}
                                    </option>
                                ))}
                            </Select>
                        ) : (
                            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[12px] text-[#64748B]">
                                No confirmed quotations found in recent list. You can switch to manual entry below.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        <Input
                            placeholder="Enter quotation ID (e.g. cmtp...)"
                            value={manualQuotationId}
                            onChange={(e) => {
                                setManualQuotationId(e.target.value);
                                setErrorMessage(null);
                                setExistingFulfillmentId(null);
                            }}
                        />
                        <p className="text-[11px] text-[#64748B]">
                            Must match an existing quotation in CONFIRMED status.
                        </p>
                    </div>
                )}

                {/* Selected Quotation Context Card */}
                {selectedQuotation && !useManualInput && (
                    <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-[12px]">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#0F172A]">
                                {selectedQuotation.quoteNumber}
                            </span>
                            <Badge variant="success" size="sm">
                                {selectedQuotation.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[#475569] pt-1">
                            <div>
                                <span className="text-[#64748B] block text-[11px]">Customer</span>
                                <span className="font-medium text-[#0F172A]">
                                    {selectedQuotation.customer.name}
                                </span>
                            </div>
                            <div>
                                <span className="text-[#64748B] block text-[11px]">Total Value</span>
                                <FinancialNumeral
                                    amount={selectedQuotation.total}
                                    className="font-medium text-[#0F172A]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Operational Notice */}
                <div className="p-3 rounded-md bg-[#EFF6FF] border border-[#DBEAFE] text-[12px] text-[#1E40AF] leading-relaxed">
                    <p className="font-medium">Deterministic Backend Inventory Engine:</p>
                    <p className="text-[11px] text-[#3B82F6] mt-0.5">
                        Inventory will be allocated across active fulfillment centers according to facility priority and stock availability. Multi-warehouse splits are resolved automatically.
                    </p>
                </div>
            </form>
        </Modal>
    );
}
