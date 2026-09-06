"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Boxes, Check } from "lucide-react";
import type { InventoryItemResponse } from "@/server/modules/warehouses/warehouse.types";

export interface UpdateInventoryModalProps {
    isOpen: boolean;
    warehouseId: string;
    inventoryItem: InventoryItemResponse | null;
    onClose: () => void;
    onSuccess?: (updated: InventoryItemResponse) => void;
}

export function UpdateInventoryModal({
    isOpen,
    warehouseId,
    inventoryItem,
    onClose,
    onSuccess,
}: UpdateInventoryModalProps) {
    const { toast } = useToast();

    const [availableQty, setAvailableQty] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (inventoryItem) {
            setAvailableQty(inventoryItem.availableQty);
            setErrorMessage(null);
        }
    }, [inventoryItem]);

    const handleClose = () => {
        if (!isSubmitting) {
            setErrorMessage(null);
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inventoryItem) return;

        if (availableQty < 0) {
            setErrorMessage("Available quantity cannot be negative.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const updated = await apiClient.updateWarehouseInventoryQty<InventoryItemResponse>(
                warehouseId,
                inventoryItem.id,
                Number(availableQty)
            );

            toast.success(
                "Inventory Updated",
                `Available stock for ${inventoryItem.product.name} updated to ${updated.availableQty} units.`
            );

            onClose();
            if (onSuccess) {
                onSuccess(updated);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to update inventory quantity.";
            setErrorMessage(msg);
            toast.error("Update Failed", msg);
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
                    <span>Update Inventory Stock</span>
                </div>
            }
            description={
                inventoryItem
                    ? `Adjust available units for ${inventoryItem.product.name}${
                          inventoryItem.variant ? ` (${inventoryItem.variant.name})` : ""
                      }.`
                    : "Adjust available units."
            }
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
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        leftIcon={<Check className="w-4 h-4" />}
                    >
                        Save Quantity
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

                {/* Product Summary */}
                {inventoryItem && (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md space-y-1">
                        <div className="text-[13px] font-semibold text-[#0F172A]">
                            {inventoryItem.product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                            <span>Category: {inventoryItem.product.category}</span>
                            {inventoryItem.variant?.sku && (
                                <>
                                    <span>•</span>
                                    <span>SKU: {inventoryItem.variant.sku}</span>
                                </>
                            )}
                        </div>
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
                        helperText="Physical units on hand available for allocation fulfillment."
                    />
                </div>
            </form>
        </Modal>
    );
}
