"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { CreditCard, AlertCircle } from "lucide-react";

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceNumber: string;
    customerName: string;
    total: number;
    isPaying: boolean;
    onConfirmPayment: () => void;
}

export function PaymentModal({
    isOpen,
    onClose,
    invoiceNumber,
    customerName,
    total,
    isPaying,
    onConfirmPayment,
}: PaymentModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#1E40AF]" />
                    <span>Record Invoice Payment</span>
                </div>
            }
            description="Authorize and record payment settlement for this billing invoice."
            footer={
                <>
                    <Button
                        variant="outline"
                        size="default"
                        disabled={isPaying}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="default"
                        isLoading={isPaying}
                        disabled={isPaying}
                        onClick={onConfirmPayment}
                    >
                        Confirm Payment
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between text-[13px] text-[#64748B]">
                        <span>Invoice Number</span>
                        <span className="font-mono font-semibold text-[#0F172A]">
                            {invoiceNumber}
                        </span>
                    </div>
                    <div className="flex justify-between text-[13px] text-[#64748B]">
                        <span>Customer</span>
                        <span className="font-medium text-[#0F172A]">
                            {customerName}
                        </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-[14px]">
                        <span className="font-medium text-[#0F172A]">Amount to Settle</span>
                        <span className="font-bold text-[#1E40AF]">
                            <FinancialNumeral value={total} />
                        </span>
                    </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[12px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        Executing this action will record the authoritative payment settlement in the backend ledger, generate a unique audit payment reference, and transition invoice status to <strong>PAID</strong>.
                    </div>
                </div>
            </div>
        </Modal>
    );
}
