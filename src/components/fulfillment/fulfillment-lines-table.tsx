"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    GitFork,
    Warehouse as WarehouseIcon,
    Package,
    AlertTriangle,
} from "lucide-react";
import type { FulfillmentLineResponse } from "@/server/modules/fulfillment/fulfillment.types";

export interface FulfillmentLinesTableProps {
    lines: FulfillmentLineResponse[];
}

export function FulfillmentLinesTable({ lines }: FulfillmentLinesTableProps) {
    if (!lines || lines.length === 0) {
        return (
            <Card className="border-[#E2E8F0]">
                <CardContent className="py-10 text-center text-[13px] text-[#64748B]">
                    No line items found for this fulfillment order.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#1E40AF]" />
                        Fulfillment Line Allocations
                    </CardTitle>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                        Authoritative product-level inventory distribution across fulfillment centers
                    </p>
                </div>
                <Badge variant="neutral" size="default">
                    {lines.length} {lines.length === 1 ? "Line Item" : "Line Items"}
                </Badge>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#F8FAFC]">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead className="w-64">Product / SKU</TableHead>
                            <TableHead className="w-24 text-right">Required</TableHead>
                            <TableHead className="w-24 text-right">Allocated</TableHead>
                            <TableHead className="w-36 text-center">Status</TableHead>
                            <TableHead>Warehouse Sourcing & Allocations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line) => {
                            const isMultiWarehouseSplit = line.allocations.length > 1;
                            const hasShortage = line.allocatedQty < line.requiredQty;
                            const totalAllocated = line.allocatedQty;

                            return (
                                <TableRow
                                    key={line.id}
                                    className="hover:bg-[#F8FAFC]/70 transition-colors"
                                >
                                    {/* Line Number */}
                                    <TableCell className="text-center font-medium text-[12px] text-[#64748B] align-top py-3.5">
                                        {line.quotationLineNumber}
                                    </TableCell>

                                    {/* Product Details */}
                                    <TableCell className="align-top py-3.5">
                                        <div className="space-y-0.5">
                                            <div className="font-medium text-[13px] text-[#0F172A] leading-snug">
                                                {line.name}
                                            </div>
                                            <div className="font-mono text-[11px] text-[#64748B]">
                                                SKU: {line.sku}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Required Qty */}
                                    <TableCell className="text-right font-medium text-[13px] text-[#0F172A] align-top py-3.5">
                                        {line.requiredQty.toLocaleString()}
                                    </TableCell>

                                    {/* Allocated Qty */}
                                    <TableCell className="text-right font-medium text-[13px] align-top py-3.5">
                                        <span
                                            className={
                                                hasShortage
                                                    ? "text-[#D97706] font-semibold"
                                                    : "text-[#16A34A] font-semibold"
                                            }
                                        >
                                            {line.allocatedQty.toLocaleString()}
                                        </span>
                                    </TableCell>

                                    {/* Status Badge */}
                                    <TableCell className="text-center align-top py-3.5">
                                        <StatusBadge
                                            type="fulfillment"
                                            status={line.status}
                                            size="sm"
                                        />
                                    </TableCell>

                                    {/* Warehouse Allocations & Multi-Warehouse Split */}
                                    <TableCell className="align-top py-3.5">
                                        <div className="space-y-2.5">
                                            {/* Multi-Warehouse Split Callout Badge */}
                                            {isMultiWarehouseSplit && (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
                                                        <GitFork className="w-3.5 h-3.5 text-[#4F46E5]" />
                                                        Multi-Warehouse Split ({line.allocations.length} Facilities)
                                                    </span>
                                                </div>
                                            )}

                                            {/* Allocation Pills */}
                                            {line.allocations.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {line.allocations.map((alloc) => {
                                                        const percentage =
                                                            totalAllocated > 0
                                                                ? Math.round(
                                                                      (alloc.quantity / totalAllocated) * 100
                                                                  )
                                                                : 0;

                                                        return (
                                                            <div
                                                                key={alloc.id}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12px] bg-white border-[#E2E8F0] shadow-2xs hover:border-[#CBD5E1] transition-colors"
                                                            >
                                                                <WarehouseIcon className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                                                <span className="font-medium text-[#0F172A]">
                                                                    {alloc.warehouse.name}
                                                                </span>
                                                                <span className="font-mono text-[10px] text-[#64748B] px-1 py-0.2 rounded bg-[#F1F5F9]">
                                                                    {alloc.warehouse.code}
                                                                </span>
                                                                <span className="text-[#94A3B8]">•</span>
                                                                <span className="font-semibold text-[#1E40AF]">
                                                                    {alloc.quantity.toLocaleString()} units
                                                                </span>
                                                                {isMultiWarehouseSplit && (
                                                                    <span className="text-[10px] font-medium text-[#64748B]">
                                                                        ({percentage}%)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-[12px] text-[#94A3B8] italic flex items-center gap-1.5">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    No warehouse allocated yet
                                                </div>
                                            )}

                                            {/* Shortage notice if partially allocated */}
                                            {hasShortage && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                                                    <span>
                                                        Shortage: {(line.requiredQty - line.allocatedQty).toLocaleString()} units unallocated
                                                    </span>
                                                </div>
                                            )}

                                            {/* Allocation Proportional Bar for Multi-Warehouse Split */}
                                            {isMultiWarehouseSplit && totalAllocated > 0 && (
                                                <div className="w-full max-w-md h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden flex">
                                                    {line.allocations.map((alloc, idx) => {
                                                        const pct = (alloc.quantity / totalAllocated) * 100;
                                                        // Distinguishable colors for segmented split bar
                                                        const barColors = [
                                                            "bg-[#2563EB]",
                                                            "bg-[#7C3AED]",
                                                            "bg-[#0D9488]",
                                                            "bg-[#D97706]",
                                                        ];
                                                        const color = barColors[idx % barColors.length];

                                                        return (
                                                            <div
                                                                key={alloc.id}
                                                                style={{ width: `${pct}%` }}
                                                                className={`${color} h-full transition-all duration-300`}
                                                                title={`${alloc.warehouse.name}: ${alloc.quantity} units (${Math.round(pct)}%)`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
    );
}
