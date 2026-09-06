"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Warehouse as WarehouseIcon, Building2, Layers } from "lucide-react";
import type { FulfillmentLineResponse } from "@/server/modules/fulfillment/fulfillment.types";

export interface WarehouseAllocationCardProps {
    lines: FulfillmentLineResponse[];
    totalAllocatedQty: number;
}

interface WarehouseSummary {
    id: string;
    name: string;
    code: string;
    priority: number;
    totalQuantity: number;
    linesFulfilled: number;
}

export function WarehouseAllocationCard({
    lines,
    totalAllocatedQty,
}: WarehouseAllocationCardProps) {
    // Strictly group the authoritative line allocations by warehouse
    const warehouseMap = new Map<string, WarehouseSummary>();

    for (const line of lines) {
        for (const alloc of line.allocations) {
            const wh = alloc.warehouse;
            const existing = warehouseMap.get(wh.id);
            if (existing) {
                existing.totalQuantity += alloc.quantity;
                existing.linesFulfilled += 1;
            } else {
                warehouseMap.set(wh.id, {
                    id: wh.id,
                    name: wh.name,
                    code: wh.code,
                    priority: wh.priority,
                    totalQuantity: alloc.quantity,
                    linesFulfilled: 1,
                });
            }
        }
    }

    const warehouseSummaries = Array.from(warehouseMap.values()).sort(
        (a, b) => a.priority - b.priority
    );

    if (warehouseSummaries.length === 0) {
        return (
            <Card className="border-[#E2E8F0] shadow-xs">
                <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                    <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <WarehouseIcon className="w-4 h-4 text-[#64748B]" />
                        Warehouse Allocations Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-6 text-center text-[13px] text-[#64748B]">
                    No warehouse allocations recorded for this fulfillment.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <WarehouseIcon className="w-4 h-4 text-[#1E40AF]" />
                        Warehouse Sourcing Summary
                    </CardTitle>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                        Inventory fulfillment breakdown across participating facilities
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="info" size="default">
                        {warehouseSummaries.length}{" "}
                        {warehouseSummaries.length === 1 ? "Facility" : "Facilities"} Participating
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {warehouseSummaries.map((wh) => {
                        const sharePercent =
                            totalAllocatedQty > 0
                                ? Math.round((wh.totalQuantity / totalAllocatedQty) * 100)
                                : 0;

                        return (
                            <div
                                key={wh.id}
                                className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-colors flex flex-col justify-between space-y-3"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#1E40AF] bg-[#DBEAFE] px-1.5 py-0.5 rounded">
                                            <Building2 className="w-3 h-3" />
                                            {wh.code}
                                        </span>
                                        <Badge variant="neutral" size="sm">
                                            Priority {wh.priority}
                                        </Badge>
                                    </div>
                                    <h4 className="font-semibold text-[13px] text-[#0F172A] leading-tight pt-1">
                                        {wh.name}
                                    </h4>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[11px] text-[#64748B]">Units Sourced</span>
                                        <span className="text-[15px] font-bold text-[#0F172A]">
                                            {wh.totalQuantity.toLocaleString()}
                                            <span className="text-[11px] font-normal text-[#64748B] ml-1">
                                                ({sharePercent}%)
                                            </span>
                                        </span>
                                    </div>

                                    {/* Mini progress track */}
                                    <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#1E40AF] rounded-full"
                                            style={{ width: `${Math.min(sharePercent, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Layers className="w-3 h-3 text-[#94A3B8]" />
                                            {wh.linesFulfilled} {wh.linesFulfilled === 1 ? "item line" : "item lines"}
                                        </span>
                                        <span>Share of order</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
