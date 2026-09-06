"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

export interface ApproveStepModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<void>;
    isSubmitting: boolean;
    levelLabel: string;
    quoteNumber: string;
}

export function ApproveStepModal({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    levelLabel,
    quoteNumber,
}: ApproveStepModalProps) {
    const [reason, setReason] = useState("");

    const handleClose = () => {
        if (isSubmitting) return;
        setReason("");
        onClose();
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        await onConfirm(reason.trim() ? reason.trim() : undefined);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Approve Step — ${levelLabel}`}
            description={`You are authorizing quotation ${quoteNumber} at the ${levelLabel} level.`}
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
                        onClick={handleConfirm}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Confirm Approval
                    </Button>
                </>
            }
        >
            <form onSubmit={handleConfirm} className="space-y-3">
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                        Approval Note / Reason <span className="text-[#94A3B8] font-normal">(Optional)</span>
                    </label>
                    <Textarea
                        placeholder="Add optional notes regarding commercial justification, exceptions, or terms..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isSubmitting}
                        maxLength={1000}
                        rows={3}
                    />
                    <div className="flex justify-end mt-1 text-[11px] text-[#94A3B8]">
                        {reason.length}/1000
                    </div>
                </div>
            </form>
        </Modal>
    );
}
