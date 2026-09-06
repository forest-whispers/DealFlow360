"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RoleGate } from "@/components/shared/role-gate";
import { DEAL_INTELLIGENCE_FRONTEND_ROLES } from "@/lib/deal-intelligence-constants";
import { DealHealthCard } from "./DealHealthCard";
import { DealRiskList } from "./DealRiskList";
import { DealContextPanel } from "./DealContextPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { DealHealthResult } from "@/types/deal-intelligence-client";

export interface DealIntelligenceSectionProps {
    quotationId: string;
    refreshTrigger: number;
}

export function DealIntelligenceSection({
    quotationId,
    refreshTrigger,
}: DealIntelligenceSectionProps) {
    const [health, setHealth] = useState<DealHealthResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.getDealHealth<DealHealthResult>(quotationId);
            setHealth(data);
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Failed to load deal health.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [quotationId]);

    useEffect(() => {
        let isMounted = true;
        apiClient
            .getDealHealth<DealHealthResult>(quotationId)
            .then((data) => {
                if (isMounted) {
                    setHealth(data);
                    setError(null);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    const message =
                        err instanceof ApiClientError
                            ? err.message
                            : "Failed to load deal health.";
                    setError(message);
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [quotationId, refreshTrigger]);

    return (
        <RoleGate allowedRoles={[...DEAL_INTELLIGENCE_FRONTEND_ROLES]}>
            <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#0F172A] tracking-tight">
                        Deal Intelligence
                    </h3>
                </div>

                {/* Deal Health & Risk Loading Skeletons */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-5/6" />
                        </div>
                    </div>
                )}

                {/* Local Error State with Retry Button */}
                {!isLoading && error && (
                    <div className="flex items-center justify-between p-3.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                        <div className="flex items-center gap-2 text-[12px]">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Failed to load deal health.</span>
                        </div>
                        <button
                            type="button"
                            onClick={fetchHealth}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B91C1C] hover:underline cursor-pointer ml-3"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry
                        </button>
                    </div>
                )}

                {/* Health & Risk Content */}
                {!isLoading && !error && health && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                        <DealHealthCard health={health} />
                        <DealRiskList factors={health.factors} />
                    </div>
                )}

                {/* Lazy Collapsible Deal Context Panel */}
                <DealContextPanel
                    quotationId={quotationId}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        </RoleGate>
    );
}
