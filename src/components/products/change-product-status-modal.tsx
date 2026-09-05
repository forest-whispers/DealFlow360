"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import type { ProductResponse } from "@/server/modules/products/product.types";

export interface ChangeProductStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductResponse | null;
    onSuccess: (productId: string, nextStatus: boolean) => void;
}

export function ChangeProductStatusModal({
    isOpen,
    onClose,
    product,
    onSuccess,
}: ChangeProductStatusModalProps) {
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!product) return null;

    const isDeactivating = product.isActive;
    const nextStatus = !product.isActive;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await apiClient.patch(
                API_ROUTES.PRODUCTS.STATUS(product.id),
                { isActive: nextStatus }
            );

            toast.success(
                isDeactivating ? "Product Deactivated" : "Product Activated",
                `${product.name} is now ${
                    isDeactivating ? "hidden from new quote creation" : "active in the catalog"
                }.`
            );

            onSuccess(product.id, nextStatus);
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : `Failed to ${isDeactivating ? "deactivate" : "activate"} product.`;
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
            title={isDeactivating ? "Deactivate Product" : "Activate Product"}
            description={
                isDeactivating
                    ? "Remove this product from active sales quoting. Existing historical quotations remain unaffected."
                    : "Make this product available for sales representatives in new deal quotations."
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
                        {isDeactivating ? "Deactivate Product" : "Activate Product"}
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

                {/* Target Product Summary Box */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-[#CBD5E1] text-[#475569]">
                        <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {product.name}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                            {product.category}
                        </p>
                    </div>
                </div>

                {/* Warning / Informational Callout */}
                {isDeactivating ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[12px] leading-4 text-[#B45309]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Catalog Impact:</strong> Deactivating this product immediately prevents sales representatives from adding it to new line items.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] leading-4 text-[#047857]">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Restore Catalog Item:</strong> Activating this product will allow it to be selected in quotation line items again.
                        </span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
