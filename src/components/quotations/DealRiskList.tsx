"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import type { DealRiskFactor, DealRiskSeverity } from "@/types/deal-intelligence-client";

export interface DealRiskListProps {
    factors: DealRiskFactor[];
}

function getSeverityBadgeVariant(severity: DealRiskSeverity): "neutral" | "warning" | "danger" {
    switch (severity) {
        case "LOW":
            return "neutral";
        case "MEDIUM":
            return "warning";
        case "HIGH":
        case "CRITICAL":
            return "danger";
        default:
            return "neutral";
    }
}

export function DealRiskList({ factors }: DealRiskListProps) {
    return (
        <Card className="border-[#E2E8F0] h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#64748B]" />
                    Risk Factors
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3 flex-1 flex flex-col justify-center">
                {factors.length === 0 ? (
                    <div className="flex items-center gap-2.5 py-3 px-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#475569]">
                        <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                        <span className="font-medium text-[#0F172A]">No active risk factors</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {factors.map((factor, idx) => (
                            <div
                                key={`${factor.type}-${idx}`}
                                className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-md bg-[#F8FAFC] border border-[#F1F5F9] text-[12px]"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Badge
                                        variant={getSeverityBadgeVariant(factor.severity)}
                                        size="sm"
                                        className="shrink-0 font-semibold uppercase tracking-wider"
                                    >
                                        {factor.severity}
                                    </Badge>
                                    <span className="text-[#334155] font-medium truncate">
                                        {factor.message}
                                    </span>
                                </div>
                                <span className="text-[#B91C1C] font-semibold tabular-nums whitespace-nowrap shrink-0 text-[11px]">
                                    Impact -{factor.impact}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
