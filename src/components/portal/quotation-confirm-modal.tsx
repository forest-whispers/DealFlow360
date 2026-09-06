"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

interface QuotationConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    quoteNumber: string;
    revisionNumber: number;
    total: number;
    currency?: string;
    isConfirming?: boolean;
    error?: string | null;
    onConfirm: () => Promise<void>;
}

export function QuotationConfirmModal({
    isOpen,
    onClose,
    quoteNumber,
    revisionNumber,
    total,
    currency = "INR",
    isConfirming = false,
    error,
    onConfirm,
}: QuotationConfirmModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Quotation & Order"
            description="Finalize commercial agreement on this quotation proposal."
            maxWidth="md"
        >
            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[13px] text-[#991B1B] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Summary Box */}
                <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-[#1E40AF]">
                        <span className="font-semibold">Quotation Reference</span>
                        <span className="font-mono font-bold">{quoteNumber}</span>
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-[#1E40AF]">
                        <span className="font-semibold">Active Revision</span>
                        <span className="font-medium">Revision {revisionNumber}</span>
                    </div>

                    <div className="pt-2 border-t border-[#DBEAFE] flex items-baseline justify-between">
                        <span className="text-[13px] font-bold text-[#0F172A]">
                            Final Order Value
                        </span>
                        <FinancialNumeral
                            amount={total}
                            currency={currency}
                            className="text-[18px] font-extrabold text-[#1E40AF]"
                        />
                    </div>
                </div>

                {/* Commercial confirmation statement */}
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#475569] leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    <p>
                        By confirming this quotation, you approve the item quantities, unit pricing, and commercial terms established in Revision {revisionNumber}. The deal will immediately lock and advance to order fulfillment.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isConfirming}
                    >
                        Review Later
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        isLoading={isConfirming}
                        onClick={onConfirm}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        className="bg-[#059669] hover:bg-[#047857] text-white"
                    >
                        Confirm & Place Order
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
