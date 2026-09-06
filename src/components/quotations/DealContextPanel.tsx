"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown, Layers, RotateCcw, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import type { DealContext } from "@/types/deal-intelligence-client";

export interface DealContextPanelProps {
    quotationId: string;
    refreshTrigger: number;
}

export function DealContextPanel({ quotationId, refreshTrigger }: DealContextPanelProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [context, setContext] = useState<DealContext | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Track previous refreshTrigger to detect changes and invalidate cache
    const prevRefreshTriggerRef = useRef<number>(refreshTrigger);

    useEffect(() => {
        if (prevRefreshTriggerRef.current !== refreshTrigger) {
            prevRefreshTriggerRef.current = refreshTrigger;
            // Invalidate/clear cached context, do NOT auto-fetch
            setContext(null);
            setError(null);
            // If currently open when trigger changes, user may want to re-fetch manually or next time they expand
            // But per rule: "invalidate/clear the cached context, do NOT automatically fetch context, fetch again only when the user expands it"
            // So if open, close it or leave it un-fetched until expanded again
            setIsOpen(false);
        }
    }, [refreshTrigger]);

    const fetchContext = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.getDealContext<DealContext>(quotationId);
            setContext(data);
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Failed to load deal context.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [quotationId]);

    const handleToggle = () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);

        // Lazy load: Only fetch if opening and no context has been loaded yet and not already loading
        if (nextOpen && !context && !isLoading) {
            fetchContext();
        }
    };

    return (
        <div className="border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
            {/* Collapsible Trigger Header */}
            <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-3.5 sm:px-4 text-left hover:bg-[#F8FAFC] transition-colors focus:outline-hidden"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                    )}
                    <span className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#64748B]" />
                        Deal Context
                    </span>
                </div>
                <span className="text-[11px] font-medium text-[#64748B]">
                    {isOpen ? "Hide Context" : "View Deal Context"}
                </span>
            </button>

            {/* Collapsible Body */}
            {isOpen && (
                <div className="p-4 sm:p-5 border-t border-[#F1F5F9] bg-[#FAFAFA]">
                    {/* Loading State Skeleton */}
                    {isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2.5"
                                >
                                    <Skeleton className="h-3.5 w-1/3" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error State with Retry */}
                    {!isLoading && error && (
                        <div className="flex items-center justify-between p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                            <div className="flex items-center gap-2 text-[12px]">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Failed to load deal context.</span>
                            </div>
                            <button
                                type="button"
                                onClick={fetchContext}
                                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B91C1C] hover:underline cursor-pointer ml-3"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Curated Deal Context Content */}
                    {!isLoading && !error && context && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[12px]">
                            {/* Quotation */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Quotation
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Quote Number</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.quotation.quoteNumber}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.quotation.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Total</span>
                                        <FinancialNumeral amount={context.quotation.total} variant="body" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Margin</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.quotation.marginPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Customer
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Tier</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.customer.tier ?? "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Discount
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.discount.status ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Approval Level</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.discount.approvalLevel ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Effective Limit</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.discount.effectiveLimit !== null && context.discount.effectiveLimit !== undefined
                                                ? `${context.discount.effectiveLimit}%`
                                                : "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Approval */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Approval
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.approval.status ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Pending Level</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.approval.pendingLevel ?? "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Negotiation */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Negotiation
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.negotiation.status ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Pending Change Requests</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.negotiation.pendingChangeRequests}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Fulfillment */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Fulfillment
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.fulfillment.status ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Required Quantity</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.fulfillment.requiredQuantity}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Allocated Quantity</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.fulfillment.allocatedQuantity}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Billing */}
                            <div className="p-3.5 rounded-md bg-white border border-[#E2E8F0] space-y-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Billing
                                </h4>
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Invoice Status</span>
                                        <span className="font-semibold text-[#0F172A]">
                                            {context.billing.invoiceStatus ?? "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Invoice Total</span>
                                        <FinancialNumeral amount={context.billing.invoiceTotal} variant="body" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#64748B]">Subscription Count</span>
                                        <span className="font-semibold text-[#0F172A] tabular-nums">
                                            {context.billing.subscriptionCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
