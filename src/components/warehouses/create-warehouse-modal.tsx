"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Building2, Warehouse as WarehouseIcon } from "lucide-react";
import type {
    WarehouseResponse,
    CreateWarehouseInput,
} from "@/server/modules/warehouses/warehouse.types";

export interface CreateWarehouseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (warehouse: WarehouseResponse) => void;
}

export function CreateWarehouseModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateWarehouseModalProps) {
    const { toast } = useToast();

    const [name, setName] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [priority, setPriority] = useState<number>(1);
    const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const resetForm = () => {
        setName("");
        setCode("");
        setPriority(1);
        setStatus("ACTIVE");
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
            const payload: CreateWarehouseInput = {
                name: trimmedName,
                code: trimmedCode,
                priority: Number(priority),
                status,
            };

            const created = await apiClient.post<WarehouseResponse>(
                API_ROUTES.WAREHOUSES.CREATE,
                payload
            );

            toast.success(
                "Warehouse Created",
                `Successfully registered facility ${created.name} (${created.code}).`
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
                    : "Failed to create warehouse facility.";
            setErrorMessage(msg);
            toast.error("Creation Failed", msg);
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
                    <span>Create Fulfillment Warehouse</span>
                </div>
            }
            description="Add a new fulfillment facility to the inventory distribution network and allocation engine."
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
                        Save Warehouse
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
                        helperText="Unique facility identifier used in allocation manifests and split orders."
                    />
                </div>

                {/* Allocation Priority and Initial Status */}
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
                            helperText="Priority 1 is filled first before cascading to 2, 3..."
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
                            <option value="ACTIVE">Active (Available for Allocations)</option>
                            <option value="INACTIVE">Inactive (Temporarily Offline)</option>
                        </Select>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
