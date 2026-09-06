"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { formatDate } from "@/lib/formatters";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { PaymentResponse } from "@/server/modules/billing/billing.types";
import type { InvoiceStatus } from "@prisma/client";

export interface PaymentHistoryCardProps {
    payments: PaymentResponse[];
    status: InvoiceStatus;
}

export function PaymentHistoryCard({
    payments,
    status,
}: PaymentHistoryCardProps) {
    return (
        <Card className="shadow-xs border-[#E2E8F0]">
            <CardHeader className="py-4 px-5 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1E40AF]" />
                    <CardTitle className="text-[14px] font-semibold text-[#0F172A]">
                        Payment & Settlement Audit
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                {payments.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#64748B]">
                        <Clock className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>
                            {status === "PENDING"
                                ? "No payments recorded yet. Invoice is pending settlement."
                                : "No payment transaction records on file."}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payments.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                                        <span className="font-mono text-[13px] font-bold text-[#0F172A]">
                                            {p.reference || "Payment Recorded"}
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-[#64748B]">
                                        Settled on {formatDate(p.paidAt, "long")}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[11px] uppercase tracking-wider text-[#64748B] block">
                                        Amount Paid
                                    </span>
                                    <span className="font-bold text-[15px] text-[#16A34A]">
                                        <FinancialNumeral value={p.amount} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
