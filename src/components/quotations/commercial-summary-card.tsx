"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Input } from "@/components/ui/input";
import { Percent, TrendingUp } from "lucide-react";
import type { QuotationSummaryResponse } from "@/server/modules/quotations/quotation.types";

export interface CommercialSummaryCardProps {
    summary: QuotationSummaryResponse | null;
    orderDiscountPercent: number;
    onOrderDiscountChange?: (val: number) => void;
    isReadOnly?: boolean;
}

export function CommercialSummaryCard({
    summary,
    orderDiscountPercent,
    onOrderDiscountChange,
    isReadOnly = false,
}: CommercialSummaryCardProps) {
    const subtotal = summary?.subtotal ?? 0;
    const lineDiscountTotal = summary?.lineDiscountTotal ?? 0;
    const orderDiscount = summary?.orderDiscount ?? 0;
    const total = summary?.total ?? 0;
    const margin = summary?.margin ?? 0;
    const marginPercent = summary?.marginPercent ?? 0;

    // Display-only blended discount calculation
    const totalDiscountAmount = lineDiscountTotal + orderDiscount;
    const blendedDiscountPercent =
        subtotal > 0 ? ((totalDiscountAmount / subtotal) * 100).toFixed(1) : "0.0";

    const isNegativeMargin = margin < 0;
    const isLowMargin = marginPercent < 20 && marginPercent >= 0;

    return (
        <Card className="border-[#E2E8F0]">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#64748B]" />
                    Commercial Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
                {/* Gross Subtotal */}
                <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#64748B]">Gross Subtotal</span>
                    <FinancialNumeral amount={subtotal} variant="body" />
                </div>

                {/* Line Discounts Total */}
                <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#64748B]">Line Discounts</span>
                    <span className="text-[#B91C1C]">
                        {lineDiscountTotal > 0 ? (
                            <FinancialNumeral
                                amount={-lineDiscountTotal}
                                variant="body"
                                className="text-[#B91C1C]"
                            />
                        ) : (
                            "—"
                        )}
                    </span>
                </div>

                {/* Order-Level Discount */}
                <div className="pt-2 pb-2 border-t border-b border-[#F1F5F9]">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[12px] font-medium text-[#0F172A]">
                            Order-Level Discount
                        </label>
                        {isReadOnly ? (
                            <span className="text-[12px] font-semibold text-[#0F172A] tabular-nums">
                                {orderDiscountPercent}%
                            </span>
                        ) : (
                            <div className="w-20">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={orderDiscountPercent}
                                    onChange={(e) => {
                                        const parsed = parseFloat(e.target.value);
                                        const sanitized = isNaN(parsed)
                                            ? 0
                                            : Math.min(100, Math.max(0, parsed));
                                        if (onOrderDiscountChange) {
                                            onOrderDiscountChange(sanitized);
                                        }
                                    }}
                                    rightIcon={<Percent className="w-3 h-3" />}
                                    isNumeric
                                    className="h-7 text-[12px] py-0 px-2"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span>Applied Discount</span>
                        <span className="text-[#B91C1C]">
                            {orderDiscount > 0 ? (
                                <FinancialNumeral
                                    amount={-orderDiscount}
                                    variant="body"
                                    className="text-[#B91C1C] text-[11px]"
                                />
                            ) : (
                                "—"
                            )}
                        </span>
                    </div>
                </div>

                {/* Blended Discount */}
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Blended Total Discount</span>
                    <span className="font-medium text-[#0F172A] tabular-nums">
                        {blendedDiscountPercent}%
                    </span>
                </div>

                {/* Net Quotation Total */}
                <div className="flex items-baseline justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[13px] font-bold text-[#0F172A]">
                        Net Total
                    </span>
                    <FinancialNumeral amount={total} variant="heading" />
                </div>

                {/* Margin & Margin % */}
                <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#64748B]">Commercial Margin</span>
                        <FinancialNumeral
                            amount={margin}
                            variant="subtotal"
                            className={
                                isNegativeMargin
                                    ? "text-[#B91C1C]"
                                    : isLowMargin
                                    ? "text-[#B45309]"
                                    : "text-[#047857]"
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#64748B]">Margin Ratio</span>
                        <span
                            className={`font-semibold tabular-nums ${
                                isNegativeMargin
                                    ? "text-[#B91C1C]"
                                    : isLowMargin
                                    ? "text-[#B45309]"
                                    : "text-[#047857]"
                            }`}
                        >
                            {marginPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
