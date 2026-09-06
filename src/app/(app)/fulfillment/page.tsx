"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { CreateFulfillmentModal } from "@/components/fulfillment/create-fulfillment-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import {
    FULFILLMENT_READ_ROLES,
    FULFILLMENT_CREATE_ROLES,
} from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import {
    ArrowRight,
    FileText,
    Plus,
    RotateCw,
    Truck,
} from "lucide-react";
import type {
    FulfillmentSummaryResponse,
    FulfillmentListResponse,
} from "@/server/modules/fulfillment/fulfillment.types";

const STATUS_FILTERS = [
    { label: "All Statuses", value: "" },
    { label: "Allocated", value: "ALLOCATED" },
    { label: "Partially Allocated", value: "PARTIALLY_ALLOCATED" },
    { label: "Pending", value: "PENDING" },
];

export default function FulfillmentQueuePage() {
    const { user: currentUser } = useAuth();

    const [fulfillments, setFulfillments] = useState<FulfillmentSummaryResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters and Pagination
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
        page: 1,
        limit: 20,
    });
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    const canCreateFulfillment =
        Boolean(currentUser && (FULFILLMENT_CREATE_ROLES as readonly string[]).includes(currentUser.role));

    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setErrorMessage(null);

            const params: Record<string, string | number> = {
                page,
                limit: 20,
            };

            if (statusFilter) {
                params.status = statusFilter;
            }

            try {
                const res = await apiClient.get<FulfillmentListResponse>(
                    API_ROUTES.FULFILLMENTS.LIST,
                    { params }
                );
                if (isMounted) {
                    setFulfillments(res.fulfillments || []);
                    setPagination(
                        res.pagination || {
                            total: 0,
                            totalPages: 1,
                            page: 1,
                            limit: 20,
                        }
                    );
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load fulfillment orders.";
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
    }, [page, statusFilter, refreshTrigger]);

    return (
        <RoleGate
            allowedRoles={[...FULFILLMENT_READ_ROLES]}
            fallback={
                <div className="py-12 text-center text-[#64748B] text-[14px]">
                    Access Restricted: You do not have permission to view fulfillment operations.
                </div>
            }
        >
            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Fulfillment & Warehouses"
                    description="Operational order fulfillment queue with multi-warehouse inventory allocation tracking."
                    breadcrumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Operations", href: "/fulfillment" },
                        { label: "Fulfillment Queue" },
                    ]}
                    actions={
                        canCreateFulfillment ? (
                            <Button
                                variant="primary"
                                size="default"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                Create Fulfillment
                            </Button>
                        ) : null
                    }
                />

                {/* Filter and Control Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                    {/* Status Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => {
                                    setStatusFilter(f.value);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                                    statusFilter === f.value
                                        ? "bg-[#1E40AF] text-white"
                                        : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                            onClick={() => setRefreshTrigger((prev) => prev + 1)}
                            isLoading={isLoading}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Fulfillment Orders Table */}
                <Card className="border-[#E2E8F0] shadow-xs">
                    {isLoading ? (
                        <div className="p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-44">Fulfillment #</TableHead>
                                        <TableHead className="w-36">Quotation #</TableHead>
                                        <TableHead className="w-24">Revision</TableHead>
                                        <TableHead className="w-36">Status</TableHead>
                                        <TableHead className="w-28 text-center">Lines</TableHead>
                                        <TableHead className="w-44">Stock Allocation</TableHead>
                                        <TableHead className="w-36">Created</TableHead>
                                        <TableHead className="w-24 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <TableRowSkeleton key={i} columns={8} />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : errorMessage ? (
                        <div className="p-8">
                            <ErrorState
                                title="Failed to load fulfillments"
                                message={errorMessage}
                                onRetry={() => setRefreshTrigger((prev) => prev + 1)}
                            />
                        </div>
                    ) : fulfillments.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={<Truck className="w-10 h-10 text-[#94A3B8]" />}
                                title={
                                    statusFilter
                                        ? "No fulfillments match the selected filter"
                                        : "No fulfillment orders created yet"
                                }
                                description={
                                    statusFilter
                                        ? "Try selecting another status tab or clear your filters."
                                        : "Confirmed quotations can be submitted to generate deterministic inventory allocations across fulfillment warehouses."
                                }
                                action={
                                    canCreateFulfillment && !statusFilter ? (
                                        <Button
                                            variant="primary"
                                            size="default"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                            onClick={() => setIsCreateModalOpen(true)}
                                        >
                                            Initiate Deal Fulfillment
                                        </Button>
                                    ) : undefined
                                }
                            />
                        </div>
                    ) : (
                        <div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#F8FAFC]">
                                        <TableHead className="w-44 font-semibold text-[#0F172A]">
                                            Fulfillment #
                                        </TableHead>
                                        <TableHead className="w-36 font-semibold text-[#0F172A]">
                                            Quotation #
                                        </TableHead>
                                        <TableHead className="w-24 font-semibold text-[#0F172A]">
                                            Revision
                                        </TableHead>
                                        <TableHead className="w-36 font-semibold text-[#0F172A]">
                                            Status
                                        </TableHead>
                                        <TableHead className="w-28 text-center font-semibold text-[#0F172A]">
                                            Lines
                                        </TableHead>
                                        <TableHead className="w-48 font-semibold text-[#0F172A]">
                                            Stock Allocation
                                        </TableHead>
                                        <TableHead className="w-36 font-semibold text-[#0F172A]">
                                            Created
                                        </TableHead>
                                        <TableHead className="w-28 text-right font-semibold text-[#0F172A]">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fulfillments.map((f) => {
                                        const allocPercent =
                                            f.totalRequiredQty > 0
                                                ? Math.round(
                                                      (f.totalAllocatedQty / f.totalRequiredQty) *
                                                          100
                                                  )
                                                : 0;

                                        return (
                                            <TableRow
                                                key={f.id}
                                                className="hover:bg-[#F8FAFC]/70 transition-colors"
                                            >
                                                {/* Fulfillment Number */}
                                                <TableCell className="font-semibold text-[13px]">
                                                    <Link
                                                        href={`/fulfillment/${f.id}`}
                                                        className="text-[#1E40AF] hover:underline flex items-center gap-1.5"
                                                    >
                                                        <Truck className="w-3.5 h-3.5 text-[#64748B]" />
                                                        {f.fulfillmentNumber}
                                                    </Link>
                                                </TableCell>

                                                {/* Quotation Number Link */}
                                                <TableCell className="text-[13px]">
                                                    <Link
                                                        href={`/quotations/${f.quotationId}`}
                                                        className="text-[#475569] hover:text-[#0F172A] hover:underline flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3 h-3 text-[#94A3B8]" />
                                                        {f.quotationNumber}
                                                    </Link>
                                                </TableCell>

                                                {/* Revision */}
                                                <TableCell className="text-[12px] text-[#64748B]">
                                                    <Badge variant="neutral" size="sm">
                                                        Rev {f.revisionNumber}
                                                    </Badge>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    <StatusBadge
                                                        type="fulfillment"
                                                        status={f.status}
                                                        size="sm"
                                                    />
                                                </TableCell>

                                                {/* Line Count */}
                                                <TableCell className="text-center text-[12px] text-[#64748B]">
                                                    {f.lineCount} {f.lineCount === 1 ? "item" : "items"}
                                                </TableCell>

                                                {/* Allocation Rate */}
                                                <TableCell>
                                                    <div className="space-y-1 max-w-[160px]">
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <span className="font-medium text-[#0F172A]">
                                                                {f.totalAllocatedQty.toLocaleString()} /{" "}
                                                                {f.totalRequiredQty.toLocaleString()}
                                                            </span>
                                                            <span className="font-semibold text-[#64748B]">
                                                                {allocPercent}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                    allocPercent === 100
                                                                        ? "bg-[#16A34A]"
                                                                        : allocPercent > 0
                                                                        ? "bg-[#2563EB]"
                                                                        : "bg-[#94A3B8]"
                                                                }`}
                                                                style={{ width: `${Math.min(allocPercent, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Created Date */}
                                                <TableCell className="text-[12px] text-[#64748B]">
                                                    {formatDate(f.createdAt)}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right">
                                                    <Link href={`/fulfillment/${f.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                                                        >
                                                            View
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
                                <div className="p-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-[12px] text-[#64748B]">
                                    <div>
                                        Showing page <strong className="text-[#0F172A]">{pagination.page}</strong> of{" "}
                                        <strong className="text-[#0F172A]">{pagination.totalPages}</strong> ({pagination.total} total orders)
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= pagination.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Create Fulfillment Modal */}
                <CreateFulfillmentModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setRefreshTrigger((prev) => prev + 1);
                    }}
                />
            </div>
        </RoleGate>
    );
}
