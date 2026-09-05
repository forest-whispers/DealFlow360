"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, DollarSign, Layers, Tag } from "lucide-react";
import type { ProductVariantResponse } from "@/server/modules/products/product.types";

export interface CreateVariantModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    onSuccess?: (variant: ProductVariantResponse) => void;
}

export function CreateVariantModal({
    isOpen,
    onClose,
    productId,
    onSuccess,
}: CreateVariantModalProps) {
    const { toast } = useToast();

    const [sku, setSku] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [price, setPrice] = useState<string>("");
    const [cost, setCostPrice] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        sku?: string;
        name?: string;
        price?: string;
        cost?: string;
    }>({});

    const handleClose = () => {
        if (isSubmitting) return;
        setSku("");
        setName("");
        setPrice("");
        setCostPrice("");
        setErrorMessage(null);
        setValidationErrors({});
        onClose();
    };

    const validate = (): boolean => {
        const errors: {
            sku?: string;
            name?: string;
            price?: string;
            cost?: string;
        } = {};

        const cleanSku = sku.trim().toUpperCase();
        if (!cleanSku || cleanSku.length < 2) {
            errors.sku = "SKU must be at least 2 characters.";
        } else if (!/^[A-Z0-9_-]+$/.test(cleanSku)) {
            errors.sku = "SKU can only contain letters, numbers, hyphens, and underscores.";
        }

        if (!name.trim() || name.trim().length < 2) {
            errors.name = "Variant name must be at least 2 characters.";
        }

        const parsedPrice = parseFloat(price);
        if (price === "" || isNaN(parsedPrice) || parsedPrice < 0) {
            errors.price = "A valid variant price (>= 0) is required.";
        }

        const parsedCost = parseFloat(cost);
        if (cost === "" || isNaN(parsedCost) || parsedCost < 0) {
            errors.cost = "A valid unit cost (>= 0) is required.";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = {
                sku: sku.trim().toUpperCase(),
                name: name.trim(),
                price: parseFloat(price),
                cost: parseFloat(cost),
                isActive: true,
            };

            const response = await apiClient.post<{ variant: ProductVariantResponse }>(
                API_ROUTES.PRODUCTS.VARIANTS.CREATE(productId),
                payload
            );

            toast.success(
                "Variant Created",
                `Variant ${response.variant.name} (${response.variant.sku}) has been added.`
            );

            handleClose();
            if (onSuccess) {
                onSuccess(response.variant);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to create variant.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Product Variant"
            description="Create a distinct sellable option or SKU under this product."
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
                        onClick={handleSubmit}
                    >
                        Add Variant
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

                {/* SKU */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        SKU Identifier <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Input
                        placeholder="e.g. LIC-ENT-500"
                        value={sku}
                        onChange={(e) => {
                            setSku(e.target.value.toUpperCase());
                            if (validationErrors.sku) {
                                setValidationErrors((prev) => ({ ...prev, sku: undefined }));
                            }
                        }}
                        leftIcon={<Tag className="w-4 h-4" />}
                        error={validationErrors.sku}
                        disabled={isSubmitting}
                        helperText="Uppercase alphanumeric characters, dashes, and underscores."
                    />
                </div>

                {/* Variant Name */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Variant Name <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Input
                        placeholder="e.g. Enterprise Tier (500 Seats)"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (validationErrors.name) {
                                setValidationErrors((prev) => ({ ...prev, name: undefined }));
                            }
                        }}
                        leftIcon={<Layers className="w-4 h-4" />}
                        error={validationErrors.name}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Pricing & Cost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Selling Price <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => {
                                setPrice(e.target.value);
                                if (validationErrors.price) {
                                    setValidationErrors((prev) => ({ ...prev, price: undefined }));
                                }
                            }}
                            leftIcon={<DollarSign className="w-4 h-4" />}
                            error={validationErrors.price}
                            isNumeric
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Unit Cost <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={cost}
                            onChange={(e) => {
                                setCostPrice(e.target.value);
                                if (validationErrors.cost) {
                                    setValidationErrors((prev) => ({ ...prev, cost: undefined }));
                                }
                            }}
                            leftIcon={<DollarSign className="w-4 h-4" />}
                            error={validationErrors.cost}
                            isNumeric
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
}
