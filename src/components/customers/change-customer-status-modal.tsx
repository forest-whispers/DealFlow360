"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, AlertTriangle, CheckCircle2, User } from "lucide-react";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";

export interface ChangeCustomerStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: CustomerResponse | null;
    onSuccess: (customerId: string, nextStatus: boolean) => void;
}

export function ChangeCustomerStatusModal({
    isOpen,
    onClose,
    customer,
    onSuccess,
}: ChangeCustomerStatusModalProps) {
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!customer) return null;

    const isDeactivating = customer.isActive;
    const nextStatus = !customer.isActive;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await apiClient.patch(
                API_ROUTES.CUSTOMERS.STATUS(customer.id),
                { isActive: nextStatus }
            );

            toast.success(
                isDeactivating ? "Customer Deactivated" : "Customer Activated",
                `${customer.name}'s account has been ${
                    isDeactivating ? "deactivated" : "activated"
                }.`
            );

            onSuccess(customer.id, nextStatus);
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : `Failed to ${isDeactivating ? "deactivate" : "activate"} customer.`;
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isSubmitting) onClose();
            }}
            title={isDeactivating ? "Deactivate Customer Account" : "Activate Customer Account"}
            description={
                isDeactivating
                    ? "Suspend customer account access and prevent issuing new quotations for this entity."
                    : "Restore active account standing and allow active quoting for this customer."
            }
            maxWidth="md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={isDeactivating ? "destructive" : "primary"}
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isDeactivating ? "Deactivate Customer" : "Activate Customer"}
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

                {/* Target Customer Summary Box */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#475569]">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {customer.name}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                            {customer.email}
                        </p>
                    </div>
                </div>

                {/* Warning / Informational Callout */}
                {isDeactivating ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[12px] leading-4 text-[#B45309]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Account Suspension:</strong> Deactivating this customer prevents them from accessing the customer portal and alerts sales reps during deal initiation.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] leading-4 text-[#047857]">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Account Restoration:</strong> Activating this customer restores full active standing and portal capabilities.
                        </span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
