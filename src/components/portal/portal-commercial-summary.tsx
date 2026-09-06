"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { StatusBadge } from "@/components/shared/status-badge";
import type {
    PortalQuotationSummaryResponse,
} from "@/server/modules/negotiation/negotiation.types";
import type { QuotationRevisionStatus, QuotationStatus } from "@prisma/client";

interface PortalCommercialSummaryProps {
    summary: PortalQuotationSummaryResponse;
    orderDiscountPercent: number;
    currency?: string;
    status: QuotationStatus;
    revisionStatus: QuotationRevisionStatus;
    revisionNumber: number;
}

export function PortalCommercialSummary({
    summary,
    orderDiscountPercent,
    currency = "INR",
    status,
    revisionStatus,
    revisionNumber,
}: PortalCommercialSummaryProps) {
    const hasDiscounts = summary.lineDiscountTotal > 0 || summary.orderDiscount > 0;
    const totalDiscounts = summary.lineDiscountTotal + summary.orderDiscount;

    return (
        <Card className="border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[15px] font-bold text-[#0F172A]">
                        Commercial Summary
                    </CardTitle>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                        Revision {revisionNumber} • {revisionStatus.replace(/_/g, " ")}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Financial Breakdown (Customer Safe) */}
                <div className="space-y-2.5 text-[13px]">
                    <div className="flex items-center justify-between text-[#475569]">
                        <span>Subtotal (List Price)</span>
                        <FinancialNumeral
                            amount={summary.subtotal}
                            currency={currency}
                            className="font-medium text-[#0F172A]"
                        />
                    </div>

                    {summary.lineDiscountTotal > 0 && (
                        <div className="flex items-center justify-between text-[#059669]">
                            <span>Line Item Discounts</span>
                            <span className="font-medium">
                                -<FinancialNumeral
                                    amount={summary.lineDiscountTotal}
                                    currency={currency}
                                />
                            </span>
                        </div>
                    )}

                    {summary.orderDiscount > 0 && (
                        <div className="flex items-center justify-between text-[#059669]">
                            <span>
                                Order Discount {orderDiscountPercent > 0 && `(${orderDiscountPercent}%)`}
                            </span>
                            <span className="font-medium">
                                -<FinancialNumeral
                                    amount={summary.orderDiscount}
                                    currency={currency}
                                />
                            </span>
                        </div>
                    )}

                    {hasDiscounts && (
                        <div className="pt-1 flex items-center justify-between text-[11px] text-[#64748B] border-t border-dashed border-[#E2E8F0]">
                            <span>Total Applied Savings</span>
                            <span className="font-semibold text-[#059669]">
                                <FinancialNumeral
                                    amount={totalDiscounts}
                                    currency={currency}
                                />
                            </span>
                        </div>
                    )}
                </div>

                {/* Net Total Highlight */}
                <div className="pt-3 border-t border-[#E2E8F0]">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[14px] font-bold text-[#0F172A]">
                            Net Amount Payable
                        </span>
                        <FinancialNumeral
                            amount={summary.total}
                            currency={currency}
                            className="text-[20px] font-extrabold text-[#1E40AF]"
                        />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 text-right">
                        Applicable taxes and freight calculated per terms
                    </p>
                </div>

                {/* Status Indicators */}
                <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] text-[#64748B]">Proposal Status</span>
                    <div className="flex items-center gap-1.5">
                        <StatusBadge type="quotation" status={status} size="sm" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
