"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, DollarSign, Package, Tag } from "lucide-react";
import type { ProductResponse } from "@/server/modules/products/product.types";

export interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (product: ProductResponse) => void;
}

export function CreateProductModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateProductModalProps) {
    const { toast } = useToast();

    const [name, setName] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [billingType, setBillingType] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
    const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
    const [basePrice, setBasePrice] = useState<string>("");
    const [costPrice, setCostPrice] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        name?: string;
        category?: string;
        basePrice?: string;
        costPrice?: string;
    }>({});

    const handleClose = () => {
        if (isSubmitting) return;
        setName("");
        setCategory("");
        setDescription("");
        setBillingType("ONE_TIME");
        setBillingInterval("MONTHLY");
        setBasePrice("");
        setCostPrice("");
        setErrorMessage(null);
        setValidationErrors({});
        onClose();
    };

    const validate = (): boolean => {
        const errors: {
            name?: string;
            category?: string;
            basePrice?: string;
            costPrice?: string;
        } = {};

        if (!name.trim() || name.trim().length < 2) {
            errors.name = "Product name must be at least 2 characters.";
        }
        if (!category.trim() || category.trim().length < 2) {
            errors.category = "Category is required.";
        }

        const parsedBasePrice = parseFloat(basePrice);
        if (basePrice === "" || isNaN(parsedBasePrice) || parsedBasePrice < 0) {
            errors.basePrice = "A valid base price (>= 0) is required.";
        }

        const parsedCostPrice = parseFloat(costPrice);
        if (costPrice === "" || isNaN(parsedCostPrice) || parsedCostPrice < 0) {
            errors.costPrice = "A valid cost price (>= 0) is required.";
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
            const payload: {
                name: string;
                category: string;
                description?: string | null;
                billingType: "ONE_TIME" | "RECURRING";
                billingInterval?: "MONTHLY" | "QUARTERLY" | "YEARLY" | null;
                basePrice: number;
                costPrice: number;
                isActive: boolean;
            } = {
                name: name.trim(),
                category: category.trim(),
                description: description.trim() || null,
                billingType,
                billingInterval: billingType === "RECURRING" ? billingInterval : null,
                basePrice: parseFloat(basePrice),
                costPrice: parseFloat(costPrice),
                isActive: true,
            };

            const response = await apiClient.post<{ product: ProductResponse }>(
                API_ROUTES.PRODUCTS.CREATE,
                payload
            );

            toast.success(
                "Product Created",
                `${response.product.name} has been added to the commercial catalog.`
            );

            handleClose();
            if (onSuccess) {
                onSuccess(response.product);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to create product.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Catalog Product"
            description="Register a sellable item, service, or subscription with baseline pricing."
            maxWidth="lg"
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
                        Add Product
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Name */}
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Product Name <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Enterprise Cloud License"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (validationErrors.name) {
                                    setValidationErrors((prev) => ({ ...prev, name: undefined }));
                                }
                            }}
                            leftIcon={<Package className="w-4 h-4" />}
                            error={validationErrors.name}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Category <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Software, Hardware, Services"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value);
                                if (validationErrors.category) {
                                    setValidationErrors((prev) => ({ ...prev, category: undefined }));
                                }
                            }}
                            leftIcon={<Tag className="w-4 h-4" />}
                            error={validationErrors.category}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Billing Model */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Billing Model
                        </label>
                        <Select
                            value={billingType}
                            onChange={(e) =>
                                setBillingType(e.target.value as "ONE_TIME" | "RECURRING")
                            }
                            disabled={isSubmitting}
                        >
                            <option value="ONE_TIME">One-Time Purchase</option>
                            <option value="RECURRING">Recurring Subscription</option>
                        </Select>
                    </div>

                    {billingType === "RECURRING" ? (
                        <div>
                            <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                                Billing Cadence / Interval <span className="text-[#B91C1C]">*</span>
                            </label>
                            <Select
                                value={billingInterval}
                                onChange={(e) =>
                                    setBillingInterval(
                                        e.target.value as "MONTHLY" | "QUARTERLY" | "YEARLY"
                                    )
                                }
                                disabled={isSubmitting}
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="YEARLY">Yearly (Annual)</option>
                            </Select>
                        </div>
                    ) : (
                        <div className="flex items-center text-[12px] text-[#64748B] pt-6">
                            <span>One-time products do not require recurring intervals.</span>
                        </div>
                    )}
                </div>

                {/* Base Price & Cost Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Base List Price <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={basePrice}
                            onChange={(e) => {
                                setBasePrice(e.target.value);
                                if (validationErrors.basePrice) {
                                    setValidationErrors((prev) => ({ ...prev, basePrice: undefined }));
                                }
                            }}
                            leftIcon={<DollarSign className="w-4 h-4" />}
                            error={validationErrors.basePrice}
                            isNumeric
                            disabled={isSubmitting}
                            helperText="Standard catalog selling rate before discount governance."
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Unit Cost Price <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={costPrice}
                            onChange={(e) => {
                                setCostPrice(e.target.value);
                                if (validationErrors.costPrice) {
                                    setValidationErrors((prev) => ({ ...prev, costPrice: undefined }));
                                }
                            }}
                            leftIcon={<DollarSign className="w-4 h-4" />}
                            error={validationErrors.costPrice}
                            isNumeric
                            disabled={isSubmitting}
                            helperText="Internal cost floor used for margin and governance evaluation."
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="pt-2">
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Product Description (Optional)
                    </label>
                    <Textarea
                        placeholder="Specifications, deliverables, or inclusion notes for sales reps..."
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </Modal>
    );
}
