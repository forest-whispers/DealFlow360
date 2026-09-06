"use client";

import React from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Badge } from "@/components/ui/badge";
import { BILLING_INTERVAL_META } from "@/lib/constants";
import type { SubscriptionLineResponse } from "@/server/modules/billing/billing.types";
import type { BillingInterval } from "@prisma/client";

export interface SubscriptionLinesTableProps {
    lines: SubscriptionLineResponse[];
    recurringAmount: number;
    interval: BillingInterval;
}

export function SubscriptionLinesTable({
    lines,
    recurringAmount,
    interval,
}: SubscriptionLinesTableProps) {
    const intervalLabel = BILLING_INTERVAL_META[interval]?.label ?? interval;

    return (
        <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#0F172A]">
                    Recurring Subscription Items ({lines.length})
                </h3>
                <Badge variant="info" size="sm">
                    {intervalLabel} Cadence
                </Badge>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-[#F8FAFC]">
                        <TableHead className="w-[50px] text-center text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            #
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            Product / Description
                        </TableHead>
                        <TableHead className="w-[100px] text-center text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            Qty
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            Unit Price / {intervalLabel}
                        </TableHead>
                        <TableHead className="w-[110px] text-center text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            Discount
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                            Recurring Total
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lines.map((line) => (
                        <TableRow key={line.id} className="hover:bg-[#F8FAFC]/60">
                            <TableCell className="text-center font-mono text-[12px] text-[#64748B]">
                                {line.quotationLineNumber}
                            </TableCell>
                            <TableCell>
                                <div className="font-medium text-[13px] text-[#0F172A]">
                                    {line.name}
                                </div>
                                {line.sku && (
                                    <div className="font-mono text-[11px] text-[#64748B]">
                                        SKU: {line.sku}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-center text-[13px] font-medium text-[#0F172A]">
                                {line.quantity}
                            </TableCell>
                            <TableCell className="text-right text-[13px] text-[#475569]">
                                <FinancialNumeral value={line.unitPrice} />
                            </TableCell>
                            <TableCell className="text-center text-[12px] text-[#475569]">
                                {line.discountPercent > 0 ? (
                                    <span className="font-medium text-[#1E40AF]">
                                        {line.discountPercent}%
                                    </span>
                                ) : (
                                    <span className="text-[#94A3B8]">—</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-[13px] text-[#0F172A]">
                                <FinancialNumeral value={line.lineTotal} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Authoritative Recurring Total from Backend */}
            <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col items-end gap-1.5 text-[13px]">
                <div className="flex justify-between w-full max-w-xs pt-1 text-[15px] font-bold text-[#0F172A]">
                    <span>Total Recurring ({intervalLabel})</span>
                    <span className="text-[#1E40AF]">
                        <FinancialNumeral value={recurringAmount} />
                    </span>
                </div>
            </div>
        </div>
    );
}
