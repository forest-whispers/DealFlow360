"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Plus, Search, User } from "lucide-react";
import type { CustomerListResponse, CustomerResponse } from "@/server/modules/customers/customer.types";
import type { CanonicalQuotationResponse } from "@/server/modules/quotations/quotation.types";

export interface CreateQuotationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (quotationId: string) => void;
}

export function CreateQuotationModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateQuotationModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [, startTransition] = useTransition();

    const [customers, setCustomers] = useState<CustomerResponse[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleClose = () => {
        if (isSubmitting) return;
        setSelectedCustomerId("");
        setSearchQuery("");
        setErrorMessage(null);
        setValidationError(null);
        onClose();
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setIsLoadingCustomers(true);
    };

    // Fetch customers when modal opens or search query changes
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const timer = setTimeout(
            async () => {
                try {
                    const params: Record<string, string | number | boolean> = {
                        limit: 50,
                        isActive: true,
                    };
                    if (searchQuery.trim()) {
                        params.search = searchQuery.trim();
                    }

                    const response = await apiClient.get<CustomerListResponse>(
                        API_ROUTES.CUSTOMERS.LIST,
                        { params }
                    );

                    if (isMounted) {
                        setCustomers(response.customers || []);
                        setIsLoadingCustomers(false);
                    }
                } catch (err: unknown) {
                    if (isMounted) {
                        const message =
                            err instanceof Error ? err.message : "Failed to load customers";
                        setErrorMessage(message);
                        setIsLoadingCustomers(false);
                    }
                }
            },
            searchQuery ? 300 : 0
        );

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isOpen, searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomerId) {
            setValidationError("Please select a customer account.");
            return;
        }

        setValidationError(null);
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const quotation = await apiClient.post<CanonicalQuotationResponse>(
                API_ROUTES.QUOTATIONS.CREATE,
                { customerId: selectedCustomerId }
            );

            toast.success(
                "Quotation Created",
                `Quotation ${quotation.quoteNumber} initialized in Draft mode.`
            );

            handleClose();

            if (onSuccess) {
                onSuccess(quotation.id);
            }

            startTransition(() => {
                router.push(`/quotations/${quotation.id}`);
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Unable to create quotation. Please try again.";
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Quotation"
            description="Initialize a new commercial quotation revision for an active customer."
            maxWidth="md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || !selectedCustomerId}
                        onClick={handleSubmit}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                        Create Quotation
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Customer Filter / Search Input */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Filter Customers
                    </label>
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by customer name or email..."
                        leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Customer Dropdown */}
                <div>
                    <label
                        htmlFor="customer-select"
                        className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                    >
                        Customer Account <span className="text-[#B91C1C]">*</span>
                    </label>

                    {isLoadingCustomers ? (
                        <div className="h-9 w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] flex items-center px-3 text-[13px] text-[#64748B]">
                            Loading active customers...
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-1">
                            <p className="text-[13px] font-medium text-[#0F172A]">
                                No active customers found
                            </p>
                            <p className="text-[12px] text-[#64748B]">
                                {searchQuery
                                    ? "No customer matches the search term. Try a different query."
                                    : "You must have at least one active customer account to initialize a quotation."}
                            </p>
                        </div>
                    ) : (
                        <Select
                            id="customer-select"
                            value={selectedCustomerId}
                            onChange={(e) => {
                                setSelectedCustomerId(e.target.value);
                                if (validationError) setValidationError(null);
                            }}
                            error={validationError ?? undefined}
                            disabled={isSubmitting}
                        >
                            <option value="">Select customer account...</option>
                            {customers.map((c) => {
                                const tierText = c.customerTier
                                    ? ` • ${c.customerTier}`
                                    : "";
                                return (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.email}){tierText}
                                    </option>
                                );
                            })}
                        </Select>
                    )}
                </div>

                {/* Information Callout */}
                <div className="flex items-start gap-2 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] leading-4 text-[#475569]">
                    <User className="w-4 h-4 shrink-0 text-[#64748B] mt-0.5" />
                    <span>
                        Initializing a quotation creates <strong>Revision 1</strong> in{" "}
                        <span className="font-semibold text-[#0F172A]">Draft</span> status.
                        You will be routed directly to the quotation deal view.
                    </span>
                </div>
            </form>
        </Modal>
    );
}
