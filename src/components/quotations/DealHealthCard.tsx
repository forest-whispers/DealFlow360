"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DEAL_HEALTH_META } from "@/lib/constants";
import { Activity } from "lucide-react";
import type { DealHealthResult } from "@/types/deal-intelligence-client";

export interface DealHealthCardProps {
    health: DealHealthResult;
}

export function DealHealthCard({ health }: DealHealthCardProps) {
    const meta = DEAL_HEALTH_META[health.status];
    const description = meta?.description || "Deal health status evaluated.";

    return (
        <Card className="border-[#E2E8F0] h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#64748B]" />
                    Deal Health
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-1">
                        <span className="text-[24px] font-bold text-[#0F172A] tabular-nums tracking-tight">
                            {health.score}
                        </span>
                        <span className="text-[13px] font-medium text-[#64748B]">
                            / 100
                        </span>
                    </div>
                    <StatusBadge type="deal-health" status={health.status} />
                </div>
                <p className="text-[12px] leading-relaxed text-[#475569]">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
