"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Boxes, Plus } from "lucide-react";
import type {
    InventoryItemResponse,
    CreateInventoryItemInput,
} from "@/server/modules/warehouses/warehouse.types";
import type {
    ProductResponse,
    ProductListResponse,
    ProductVariantResponse,
    ProductVariantListResponse,
} from "@/server/modules/products/product.types";

export interface AddInventoryModalProps {
    isOpen: boolean;
    warehouseId: string;
    warehouseName: string;
    onClose: () => void;
    onSuccess?: (item: InventoryItemResponse) => void;
}

export function AddInventoryModal({
    isOpen,
    warehouseId,
    warehouseName,
    onClose,
    onSuccess,
}: AddInventoryModalProps) {
    const { toast } = useToast();

    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
    const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(false);
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");

    const [availableQty, setAvailableQty] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch active products on modal open
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const res = await apiClient.get<ProductListResponse>(
                    API_ROUTES.PRODUCTS.LIST,
                    { params: { limit: 100, isActive: true } }
                );
                if (isMounted) {
                    const list = res.products || [];
                    setProducts(list);
                    if (list.length > 0) {
                        setSelectedProductId(list[0].id);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load product catalogue.";
                    setErrorMessage(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProducts(false);
                }
            }
        };

        fetchProducts();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // Fetch variants whenever selected product changes
    useEffect(() => {
        if (!selectedProductId) {
            setVariants([]);
            setSelectedVariantId("");
            return;
        }

        let isMounted = true;
        const fetchVariants = async () => {
            setIsLoadingVariants(true);
            try {
                const res = await apiClient.get<ProductVariantListResponse>(
                    API_ROUTES.PRODUCTS.VARIANTS.LIST(selectedProductId)
                );
                if (isMounted) {
                    const varList = res.variants || [];
                    setVariants(varList);
                    setSelectedVariantId(varList.length > 0 ? varList[0].id : "");
                }
            } catch {
                if (isMounted) {
                    setVariants([]);
                    setSelectedVariantId("");
                }
            } finally {
                if (isMounted) {
                    setIsLoadingVariants(false);
                }
            }
        };

        fetchVariants();

        return () => {
            isMounted = false;
        };
    }, [selectedProductId]);

    const resetForm = () => {
        setSelectedProductId(products.length > 0 ? products[0].id : "");
        setSelectedVariantId("");
        setAvailableQty(0);
        setErrorMessage(null);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            resetForm();
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProductId) {
            setErrorMessage("Please select a product.");
            return;
        }

        if (availableQty < 0) {
            setErrorMessage("Available quantity cannot be negative.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload: CreateInventoryItemInput = {
                productId: selectedProductId,
                variantId: selectedVariantId || null,
                availableQty: Number(availableQty),
            };

            const created = await apiClient.addWarehouseInventory<InventoryItemResponse>(
                warehouseId,
                payload
            );

            toast.success(
                "Inventory Added",
                `Added ${created.availableQty} units of ${created.product.name} to ${warehouseName}.`
            );

            resetForm();
            onClose();
            if (onSuccess) {
                onSuccess(created);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to add inventory record.";
            setErrorMessage(msg);
            toast.error("Inventory Action Failed", msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-[#1E40AF]" />
                    <span>Add Inventory Stock</span>
                </div>
            }
            description={`Record on-hand inventory stock at ${warehouseName}.`}
            maxWidth="md"
            footer={
                <div className="flex items-center justify-end gap-2 w-full">
                    <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="default"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || isLoadingProducts}
                        onClick={handleSubmit}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Add Stock
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold">Error:</strong>
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* Product Select */}
                <div className="space-y-1">
                    <label className="text-[13px] font-medium text-[#0F172A] block">
                        Select Product <span className="text-[#DC2626]">*</span>
                    </label>
                    <Select
                        value={selectedProductId}
                        onChange={(e) => {
                            setSelectedProductId(e.target.value);
                            setErrorMessage(null);
                        }}
                        disabled={isSubmitting || isLoadingProducts}
                    >
                        {isLoadingProducts ? (
                            <option value="">Loading catalog...</option>
                        ) : products.length === 0 ? (
                            <option value="">No active products found</option>
                        ) : (
                            products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.category})
                                </option>
                            ))
                        )}
                    </Select>
                </div>

                {/* Variant Select (if available) */}
                {variants.length > 0 && (
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#0F172A] block">
                            Select Variant / SKU
                        </label>
                        <Select
                            value={selectedVariantId}
                            onChange={(e) => {
                                setSelectedVariantId(e.target.value);
                                setErrorMessage(null);
                            }}
                            disabled={isSubmitting || isLoadingVariants}
                        >
                            <option value="">-- Master Product (No Variant) --</option>
                            {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} ({v.sku})
                                </option>
                            ))}
                        </Select>
                    </div>
                )}

                {/* Available Quantity */}
                <div className="space-y-1">
                    <label className="text-[13px] font-medium text-[#0F172A] block">
                        Available Stock Quantity <span className="text-[#DC2626]">*</span>
                    </label>
                    <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={availableQty}
                        onChange={(e) => {
                            setAvailableQty(Math.max(0, parseInt(e.target.value, 10) || 0));
                            setErrorMessage(null);
                        }}
                        disabled={isSubmitting}
                        helperText="Physical units on hand available for allocation engine fulfillment."
                    />
                </div>
            </form>
        </Modal>
    );
}
