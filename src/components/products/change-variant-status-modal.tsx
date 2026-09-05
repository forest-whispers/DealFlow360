"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import type { ProductVariantResponse } from "@/server/modules/products/product.types";

export interface ChangeVariantStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    variant: ProductVariantResponse | null;
    onSuccess: (variantId: string, nextStatus: boolean) => void;
}

export function ChangeVariantStatusModal({
    isOpen,
    onClose,
    productId,
    variant,
    onSuccess,
}: ChangeVariantStatusModalProps) {
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!variant) return null;

    const isDeactivating = variant.isActive;
    const nextStatus = !variant.isActive;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await apiClient.patch(
                API_ROUTES.PRODUCTS.VARIANTS.STATUS(productId, variant.id),
                { isActive: nextStatus }
            );

            toast.success(
                isDeactivating ? "Variant Deactivated" : "Variant Activated",
                `Variant ${variant.name} (${variant.sku}) is now ${
                    isDeactivating ? "deactivated" : "active"
                }.`
            );

            onSuccess(variant.id, nextStatus);
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : `Failed to ${isDeactivating ? "deactivate" : "activate"} variant.`;
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
            title={isDeactivating ? "Deactivate Variant" : "Activate Variant"}
            description={
                isDeactivating
                    ? "Deactivate this SKU to prevent sales reps from quoting this specific variant."
                    : "Make this variant SKU available again for sales quoting."
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
                        {isDeactivating ? "Deactivate Variant" : "Activate Variant"}
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

                {/* Target Variant Summary Box */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-[#CBD5E1] text-[#475569]">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {variant.name}
                        </p>
                        <p className="text-[11px] text-[#64748B] font-mono truncate">
                            SKU: {variant.sku}
                        </p>
                    </div>
                </div>

                {/* Warning / Informational Callout */}
                {isDeactivating ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[12px] leading-4 text-[#B45309]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Variant Deactivation:</strong> Quotes will no longer be able to select this specific SKU option.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] leading-4 text-[#047857]">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Restore Variant:</strong> This SKU will become active for quote configuration.
                        </span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
