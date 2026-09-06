"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import type {
    CreateChangeRequestInput,
    PortalQuotationLineResponse,
} from "@/server/modules/negotiation/negotiation.types";

interface ChangeRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    lines: PortalQuotationLineResponse[];
    initialLineNumber?: number;
    isSubmitting?: boolean;
    onSubmit: (input: CreateChangeRequestInput) => Promise<void>;
}

type ProposalScope = "LINE" | "ORDER";

export function ChangeRequestModal({
    isOpen,
    onClose,
    lines,
    initialLineNumber,
    isSubmitting = false,
    onSubmit,
}: ChangeRequestModalProps) {
    const targetLine = (initialLineNumber && lines.find((l) => l.lineNumber === initialLineNumber)) || lines[0] || null;

    const [scope, setScope] = useState<ProposalScope>(targetLine ? "LINE" : "ORDER");
    const [selectedLineNumber, setSelectedLineNumber] = useState<number>(targetLine?.lineNumber ?? 1);
    const [quantity, setQuantity] = useState<string>(targetLine ? String(targetLine.quantity) : "");
    const [discountPercent, setDiscountPercent] = useState<string>(targetLine ? String(targetLine.discountPercent) : "");
    const [orderDiscountPercent, setOrderDiscountPercent] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleClose = () => {
        setValidationError(null);
        setMessage("");
        onClose();
    };

    // Update form fields when user switches selected line item
    const handleLineSelect = (lineNum: number) => {
        setSelectedLineNumber(lineNum);
        const line = lines.find((l) => l.lineNumber === lineNum);
        if (line) {
            setQuantity(String(line.quantity));
            setDiscountPercent(String(line.discountPercent));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        const payload: CreateChangeRequestInput = {};
        if (message.trim()) {
            payload.message = message.trim();
        }

        if (scope === "LINE") {
            payload.lineNumber = selectedLineNumber;

            const qNum = quantity ? parseInt(quantity, 10) : undefined;
            const dNum = discountPercent ? parseFloat(discountPercent) : undefined;

            if (qNum !== undefined) {
                if (isNaN(qNum) || qNum < 1) {
                    setValidationError("Quantity must be a positive integer.");
                    return;
                }
                payload.quantity = qNum;
            }

            if (dNum !== undefined) {
                if (isNaN(dNum) || dNum < 0 || dNum > 100) {
                    setValidationError("Discount percent must be between 0 and 100.");
                    return;
                }
                payload.discountPercent = dNum;
            }

            if (payload.quantity === undefined && payload.discountPercent === undefined) {
                setValidationError("Please specify a target quantity or discount percent.");
                return;
            }
        } else {
            const odNum = orderDiscountPercent ? parseFloat(orderDiscountPercent) : undefined;
            if (odNum === undefined || isNaN(odNum) || odNum < 0 || odNum > 100) {
                setValidationError("Order discount percent must be a valid percentage between 0 and 100.");
                return;
            }
            payload.orderDiscountPercent = odNum;
        }

        try {
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setValidationError(err.message);
            } else {
                setValidationError("Failed to submit change request.");
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Propose Commercial Change"
            description="Submit a structured proposal for quantity or discount adjustment on this quotation."
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {validationError && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#991B1B] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* Scope selector */}
                <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#0F172A]">
                        Scope of Change
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setScope("LINE")}
                            className={`p-2.5 rounded-md border text-[12px] font-medium transition-colors text-left ${
                                scope === "LINE"
                                    ? "border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]"
                                    : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                            }`}
                        >
                            <span className="font-semibold block">Specific Line Item</span>
                            <span className="text-[11px] text-[#64748B]">
                                Adjust line quantity or item discount
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setScope("ORDER")}
                            className={`p-2.5 rounded-md border text-[12px] font-medium transition-colors text-left ${
                                scope === "ORDER"
                                    ? "border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]"
                                    : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                            }`}
                        >
                            <span className="font-semibold block">Entire Order</span>
                            <span className="text-[11px] text-[#64748B]">
                                Apply overall order discount
                            </span>
                        </button>
                    </div>
                </div>

                {scope === "LINE" ? (
                    <>
                        {/* Target line selector */}
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[#0F172A]">
                                Select Quotation Line
                            </label>
                            <Select
                                value={selectedLineNumber}
                                onChange={(e) => handleLineSelect(parseInt(e.target.value, 10))}
                            >
                                {lines.map((l) => (
                                    <option key={l.lineNumber} value={l.lineNumber}>
                                        Line #{l.lineNumber} — {l.name} ({l.quantity} units @ {l.unitPrice})
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[12px] font-semibold text-[#0F172A]">
                                    Target Quantity
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="e.g. 25"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-semibold text-[#0F172A]">
                                    Target Discount (%)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[#0F172A]">
                            Target Order Discount (%)
                        </label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={orderDiscountPercent}
                            onChange={(e) => setOrderDiscountPercent(e.target.value)}
                            placeholder="e.g. 5"
                        />
                    </div>
                )}

                {/* Optional Message */}
                <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#0F172A]">
                        Commercial Note / Justification (Optional)
                    </label>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Provide rationale for your requested adjustment (e.g., annual volume commitment, budget constraints)..."
                        rows={3}
                        maxLength={1000}
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmitting}
                    >
                        Submit Change Request
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
