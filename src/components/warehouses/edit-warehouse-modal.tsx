"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Building2, Warehouse as WarehouseIcon } from "lucide-react";
import type {
    WarehouseResponse,
    UpdateWarehouseInput,
} from "@/server/modules/warehouses/warehouse.types";

export interface EditWarehouseModalProps {
    isOpen: boolean;
    warehouse: WarehouseResponse | null;
    onClose: () => void;
    onSuccess?: (warehouse: WarehouseResponse) => void;
}

export function EditWarehouseModal({
    isOpen,
    warehouse,
    onClose,
    onSuccess,
}: EditWarehouseModalProps) {
    const { toast } = useToast();

    const [name, setName] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [priority, setPriority] = useState<number>(1);
    const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (warehouse) {
            setName(warehouse.name);
            setCode(warehouse.code);
            setPriority(warehouse.priority);
            setStatus(warehouse.status);
            setErrorMessage(null);
        }
    }, [warehouse]);

    const handleClose = () => {
        if (!isSubmitting) {
            setErrorMessage(null);
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouse) return;

        const trimmedName = name.trim();
        const trimmedCode = code.trim().toUpperCase();

        if (!trimmedName) {
            setErrorMessage("Warehouse name is required.");
            return;
        }

        if (!trimmedCode) {
            setErrorMessage("Warehouse code is required.");
            return;
        }

        if (!priority || priority < 1) {
            setErrorMessage("Priority must be at least 1.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload: UpdateWarehouseInput = {
                name: trimmedName,
                code: trimmedCode,
                priority: Number(priority),
                status,
            };

            const updated = await apiClient.updateWarehouse<WarehouseResponse>(
                warehouse.id,
                payload
            );

            toast.success(
                "Warehouse Updated",
                `Successfully updated facility ${updated.name} (${updated.code}).`
            );

            onClose();
            if (onSuccess) {
                onSuccess(updated);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to update warehouse facility.";
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
                    <Building2 className="w-5 h-5 text-[#1E40AF]" />
                    <span>Edit Fulfillment Warehouse</span>
                </div>
            }
            description={`Update facility parameters and allocation priority for ${warehouse?.name || "facility"}.`}
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
                        leftIcon={<WarehouseIcon className="w-4 h-4" />}
                    >
                        Save Changes
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold">Validation Error:</strong>
                            <span>{errorMessage}</span>
                        </div>
                    </div>
                )}

                {/* Facility Name */}
                <div className="space-y-1">
                    <label className="text-[13px] font-medium text-[#0F172A] block">
                        Facility Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <Input
                        placeholder="e.g. Northern Distribution Hub"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setErrorMessage(null);
                        }}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Facility Code */}
                <div className="space-y-1">
                    <label className="text-[13px] font-medium text-[#0F172A] block">
                        Facility Code <span className="text-[#DC2626]">*</span>
                    </label>
                    <Input
                        placeholder="e.g. WH-NORTH-01"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setErrorMessage(null);
                        }}
                        disabled={isSubmitting}
                        helperText="Unique facility identifier used in allocation manifests."
                    />
                </div>

                {/* Allocation Priority and Operational Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#0F172A] block">
                            Allocation Priority
                        </label>
                        <Input
                            type="number"
                            min={1}
                            value={priority}
                            onChange={(e) => {
                                setPriority(parseInt(e.target.value, 10) || 1);
                                setErrorMessage(null);
                            }}
                            disabled={isSubmitting}
                            helperText="Priority 1 is filled first before 2, 3..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#0F172A] block">
                            Operational Status
                        </label>
                        <Select
                            value={status}
                            onChange={(e) =>
                                setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                            }
                            disabled={isSubmitting}
                        >
                            <option value="ACTIVE">Active (Available)</option>
                            <option value="INACTIVE">Inactive (Offline)</option>
                        </Select>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
