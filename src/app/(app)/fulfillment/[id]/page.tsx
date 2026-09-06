"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { FulfillmentLinesTable } from "@/components/fulfillment/fulfillment-lines-table";
import { WarehouseAllocationCard } from "@/components/fulfillment/warehouse-allocation-card";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { FULFILLMENT_READ_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import {
    ArrowLeft,
    Boxes,
    Building2,
    Calendar,
    FileText,
    GitFork,
    RotateCw,
    Truck,
    Receipt,
} from "lucide-react";
import type { CanonicalFulfillmentResponse } from "@/server/modules/fulfillment/fulfillment.types";
import type {
    InvoiceListResponse,
    InvoiceSummaryResponse,
} from "@/server/modules/billing/billing.types";

interface FulfillmentDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function FulfillmentDetailPage({ params }: FulfillmentDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [fulfillment, setFulfillment] = useState<CanonicalFulfillmentResponse | null>(
        null
    );
    const [existingInvoice, setExistingInvoice] = useState<InvoiceSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const res = await apiClient.get<CanonicalFulfillmentResponse>(
                    API_ROUTES.FULFILLMENTS.BY_ID(id)
                );
                if (isMounted) {
                    setFulfillment(res);

                    // Authoritative lookup for quotation's invoice
                    if (res.quotationId) {
                        apiClient
                            .get<InvoiceListResponse>(API_ROUTES.INVOICES.LIST, {
                                params: { quotationId: res.quotationId },
                            })
                            .then((invRes) => {
                                if (isMounted && invRes.invoices && invRes.invoices.length > 0) {
                                    setExistingInvoice(invRes.invoices[0]);
                                }
                            })
                            .catch(() => {});
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load fulfillment order details.";
                    setErrorMessage(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [id, refreshTrigger]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2 pb-4 border-b border-[#E2E8F0]">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                </div>
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    if (errorMessage || !fulfillment) {
        return (
            <div className="space-y-6">
                <Link
                    href="/fulfillment"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Fulfillment Queue
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Fulfillment Order Not Found"
                            message={errorMessage || "The requested fulfillment record could not be loaded."}
                            onRetry={() => {
                                setIsLoading(true);
                                setErrorMessage(null);
                                setRefreshTrigger((prev) => prev + 1);
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Authoritative derived counts strictly from backend response
    const totalLines = fulfillment.lines.length;
    const fullyAllocatedLines = fulfillment.lines.filter(
        (l) => l.status === "ALLOCATED"
    ).length;
    const uniqueWarehouses = new Set(
        fulfillment.lines.flatMap((l) => l.allocations.map((a) => a.warehouse.id))
    );
    const hasMultiWarehouseSplit = fulfillment.lines.some(
        (l) => l.allocations.length > 1
    );
    const allocationRate =
        fulfillment.totalRequiredQty > 0
            ? Math.round(
                  (fulfillment.totalAllocatedQty / fulfillment.totalRequiredQty) * 100
              )
            : 0;

    return (
        <RoleGate allowedRoles={[...FULFILLMENT_READ_ROLES]}>
            <div className="space-y-6">
                {/* Navigation Back Link */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <Link
                        href="/fulfillment"
                        className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back to Fulfillment Queue
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                            onClick={() => setRefreshTrigger((prev) => prev + 1)}
                        >
                            Refresh
                        </Button>
                        <Link href={`/quotations/${fulfillment.quotationId}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<FileText className="w-3.5 h-3.5" />}
                            >
                                View Quotation {fulfillment.quotationNumber}
                            </Button>
                        </Link>
                        {existingInvoice && (
                            <Link href={`/billing/${existingInvoice.id}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Receipt className="w-3.5 h-3.5" />}
                                >
                                    View Invoice ({existingInvoice.invoiceNumber})
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Header Title Section */}
                <div className="pb-4 border-b border-[#E2E8F0] space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-[22px] leading-[28px] font-bold text-[#0F172A] flex items-center gap-2">
                            <Truck className="w-6 h-6 text-[#1E40AF]" />
                            {fulfillment.fulfillmentNumber}
                        </h1>
                        <StatusBadge type="fulfillment" status={fulfillment.status} size="default" />
                        {hasMultiWarehouseSplit && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
                                <GitFork className="w-3.5 h-3.5 text-[#4F46E5]" />
                                Multi-Warehouse Split Active
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-[#64748B] flex-wrap">
                        <span className="flex items-center gap-1">
                            <span>Origin Quotation:</span>
                            <Link
                                href={`/quotations/${fulfillment.quotationId}`}
                                className="font-semibold text-[#1E40AF] hover:underline"
                            >
                                {fulfillment.quotationNumber}
                            </Link>
                        </span>
                        <span>•</span>
                        <span>
                            Confirmed Revision: <strong className="text-[#0F172A]">Rev {fulfillment.revisionNumber}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                            Created {formatDate(fulfillment.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Operational Metrics Cards Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Fulfillment Status */}
                    <Card className="border-[#E2E8F0] p-4 shadow-xs">
                        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block">
                            Fulfillment State
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                            <StatusBadge type="fulfillment" status={fulfillment.status} size="default" />
                            <Truck className="w-5 h-5 text-[#94A3B8]" />
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-2">
                            {fulfillment.status === "ALLOCATED"
                                ? "Full quantity successfully allocated across facilities"
                                : fulfillment.status === "PARTIALLY_ALLOCATED"
                                ? "Partial inventory assigned; shortage awaiting restock"
                                : "Fulfillment generated, awaiting inventory assignment"}
                        </p>
                    </Card>

                    {/* Card 2: Total Units Allocated */}
                    <Card className="border-[#E2E8F0] p-4 shadow-xs">
                        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block">
                            Units Allocated
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-[20px] font-bold text-[#0F172A]">
                                {fulfillment.totalAllocatedQty.toLocaleString()}
                                <span className="text-[13px] font-normal text-[#64748B] ml-1">
                                    / {fulfillment.totalRequiredQty.toLocaleString()}
                                </span>
                            </span>
                            <span className="font-semibold text-[13px] text-[#1E40AF]">
                                {allocationRate}%
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-2">
                            <div
                                className={`h-full rounded-full ${
                                    allocationRate === 100
                                        ? "bg-[#16A34A]"
                                        : allocationRate > 0
                                        ? "bg-[#2563EB]"
                                        : "bg-[#94A3B8]"
                                }`}
                                style={{ width: `${Math.min(allocationRate, 100)}%` }}
                            />
                        </div>
                    </Card>

                    {/* Card 3: Line Completeness */}
                    <Card className="border-[#E2E8F0] p-4 shadow-xs">
                        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block">
                            Line Completeness
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-[20px] font-bold text-[#0F172A]">
                                {fullyAllocatedLines}
                                <span className="text-[13px] font-normal text-[#64748B] ml-1">
                                    / {totalLines} lines
                                </span>
                            </span>
                            <Boxes className="w-5 h-5 text-[#94A3B8]" />
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-2">
                            {fullyAllocatedLines === totalLines
                                ? "All order line items fully sourced"
                                : `${totalLines - fullyAllocatedLines} lines pending or partially fulfilled`}
                        </p>
                    </Card>

                    {/* Card 4: Facilities Sourced */}
                    <Card className="border-[#E2E8F0] p-4 shadow-xs">
                        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block">
                            Active Facilities Sourced
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-[20px] font-bold text-[#0F172A]">
                                {uniqueWarehouses.size}
                                <span className="text-[13px] font-normal text-[#64748B] ml-1">
                                    {uniqueWarehouses.size === 1 ? "warehouse" : "warehouses"}
                                </span>
                            </span>
                            <Building2 className="w-5 h-5 text-[#94A3B8]" />
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-2">
                            {hasMultiWarehouseSplit
                                ? "Split fulfillment order across multiple depots"
                                : "Fulfilled entirely from a single warehouse"}
                        </p>
                    </Card>
                </div>

                {/* Warehouse Sourcing Summary Card */}
                <WarehouseAllocationCard
                    lines={fulfillment.lines}
                    totalAllocatedQty={fulfillment.totalAllocatedQty}
                />

                {/* Authoritative Line Allocations Table */}
                <FulfillmentLinesTable lines={fulfillment.lines} />
            </div>
        </RoleGate>
    );
}
