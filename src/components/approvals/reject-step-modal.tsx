"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, XCircle } from "lucide-react";

export interface RejectStepModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    isSubmitting: boolean;
    levelLabel: string;
    quoteNumber: string;
}

export function RejectStepModal({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    levelLabel,
    quoteNumber,
}: RejectStepModalProps) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        if (isSubmitting) return;
        setReason("");
        setError(null);
        onClose();
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError("A reason is required to reject an approval request.");
            return;
        }

        setError(null);
        await onConfirm(trimmed);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Reject Quotation Approval"
            description={`Rejection is terminal. Rejecting this ${levelLabel} step will mark quotation ${quoteNumber} as REJECTED.`}
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
                        variant="destructive"
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={handleConfirm}
                    >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Reject Quotation
                    </Button>
                </>
            }
        >
            <form onSubmit={handleConfirm} className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                        <strong>Warning:</strong> This decision cannot be reversed internally. The quotation workflow will terminate and must be revised by the sales team.
                    </span>
                </div>

                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                        Rejection Reason <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Textarea
                        placeholder="Explain why this quotation is being rejected (e.g., margin below target, terms unacceptable, excessive discount)..."
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (error) setError(null);
                        }}
                        disabled={isSubmitting}
                        maxLength={1000}
                        rows={3}
                        required
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                        {error ? (
                            <span className="text-[#B91C1C] font-medium">{error}</span>
                        ) : (
                            <span className="text-[#64748B]">Provide actionable feedback for the sales representative.</span>
                        )}
                        <span className="text-[#94A3B8]">{reason.length}/1000</span>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
