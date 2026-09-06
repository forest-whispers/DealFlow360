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
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import type { PortalQuotationLineResponse } from "@/server/modules/negotiation/negotiation.types";

interface PortalQuotationLinesProps {
    lines: PortalQuotationLineResponse[];
    currency?: string;
    isNegotiable?: boolean;
    onRequestLineChange?: (lineNumber: number) => void;
}

export function PortalQuotationLines({
    lines,
    currency = "INR",
    isNegotiable = false,
    onRequestLineChange,
}: PortalQuotationLinesProps) {
    if (!lines || lines.length === 0) {
        return (
            <div className="p-8 text-center text-[13px] text-[#64748B]">
                No items included in this quotation revision.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Product / Service</TableHead>
                        <TableHead align="right" className="w-24">Qty</TableHead>
                        <TableHead align="right" className="w-32">Unit Price</TableHead>
                        <TableHead align="right" className="w-24">Discount</TableHead>
                        <TableHead align="right" className="w-36">Line Total</TableHead>
                        {isNegotiable && onRequestLineChange && (
                            <TableHead align="right" className="w-28">Action</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lines.map((line) => (
                        <TableRow key={line.lineNumber}>
                            <TableCell className="text-center font-medium text-[#64748B]">
                                {line.lineNumber}
                            </TableCell>

                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[#0F172A]">
                                        {line.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                                        {line.sku && (
                                            <span className="font-mono text-[#475569]">
                                                SKU: {line.sku}
                                            </span>
                                        )}
                                        {line.sku && <span>•</span>}
                                        <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium">
                                            {line.category}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>

                            <TableCell align="right" className="font-medium text-[#0F172A] tabular-nums">
                                {line.quantity.toLocaleString()}
                            </TableCell>

                            <TableCell align="right" className="tabular-nums text-[#334155]">
                                <FinancialNumeral
                                    amount={line.unitPrice}
                                    currency={currency}
                                />
                            </TableCell>

                            <TableCell align="right" className="tabular-nums">
                                {line.discountPercent > 0 ? (
                                    <span className="text-[#059669] font-medium">
                                        {line.discountPercent}%
                                    </span>
                                ) : (
                                    <span className="text-[#94A3B8]">—</span>
                                )}
                            </TableCell>

                            <TableCell align="right" className="font-bold text-[#0F172A] tabular-nums">
                                <FinancialNumeral
                                    amount={line.lineTotal}
                                    currency={currency}
                                />
                            </TableCell>

                            {isNegotiable && onRequestLineChange && (
                                <TableCell align="right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRequestLineChange(line.lineNumber)}
                                        leftIcon={<Edit3 className="w-3 h-3 text-[#1E40AF]" />}
                                        className="text-[12px] text-[#1E40AF] hover:text-[#1E3A8A] hover:bg-[#EFF6FF] px-2 py-1 h-7"
                                    >
                                        Propose
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
