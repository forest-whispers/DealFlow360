"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { APPROVAL_NAV_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import {
    ArrowRight,
    Clock,
    RotateCw,
    Search,
    ShieldCheck,
} from "lucide-react";
import type {
    QuotationCardResponse,
    QuotationListResponse,
} from "@/server/modules/quotations/quotation.types";

export default function ApprovalQueuePage() {
    const { user: currentUser } = useAuth();

    const [quotations, setQuotations] = useState<QuotationCardResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Search and Pagination
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
        page: 1,
        limit: 20,
    });
    const [refreshIndex, setRefreshIndex] = useState<number>(0);

    const isAuthorized =
        currentUser && APPROVAL_NAV_ROLES.includes(currentUser.role);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    // Fetch approval queue: strictly backed by GET /api/quotations?status=PENDING_APPROVAL
    useEffect(() => {
        if (!isAuthorized) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const params: Record<string, string | number> = {
                    status: "PENDING_APPROVAL",
                    page,
                    limit: 20,
                };
                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const response = await apiClient.get<QuotationListResponse>(
                    API_ROUTES.QUOTATIONS.LIST,
                    { params }
                );

                if (isMounted) {
                    setQuotations(response.quotations || []);
                    setPagination(
                        response.pagination || {
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
                            : "Failed to load approval queue.";
                    setErrorMessage(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }, 50);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isAuthorized, debouncedSearch, page, refreshIndex]);

    if (!isAuthorized) {
        return (
            <div className="py-6">
                <ErrorState
                    title="Access Restricted"
                    message="You do not have administrative or approval authority to access the Approval Workspace. Contact your administrator if you believe this is an error."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Page Header */}
            <PageHeader
                title="Approvals"
                description="Review and decide pending commercial deal approvals for your organization."
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRefreshIndex((prev) => prev + 1)}
                        disabled={isLoading}
                    >
                        <RotateCw
                            className={`w-3.5 h-3.5 mr-1.5 ${
                                isLoading ? "animate-spin" : ""
                            }`}
                        />
                        Refresh Queue
                    </Button>
                }
            />

            {/* Filter Bar: Search Input */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-80">
                    <Input
                        placeholder="Search by quote number or customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                    />
                </div>

                <div className="text-[12px] text-[#64748B] flex items-center gap-2 self-start sm:self-center">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>
                        <strong>{pagination.total}</strong>{" "}
                        {pagination.total === 1 ? "quotation" : "quotations"} requiring approval
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
                <ErrorState
                    title="Error Loading Approvals"
                    message={errorMessage}
                    onRetry={() => setRefreshIndex((prev) => prev + 1)}
                />
            )}

            {/* Approval Queue Table */}
            {!errorMessage && (
                <Card className="border-[#E2E8F0] overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#F8FAFC]">
                                    <TableHead className="w-[160px]">Quotation #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="w-[160px]">Status</TableHead>
                                    <TableHead className="w-[140px] text-right">
                                        Quotation Total
                                    </TableHead>
                                    <TableHead className="w-[140px]">Submitted Date</TableHead>
                                    <TableHead className="w-[120px] text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRowSkeleton key={i} columns={6} />
                                    ))
                                ) : quotations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12">
                                            <EmptyState
                                                title="No approvals require your attention"
                                                description={
                                                    debouncedSearch
                                                        ? "No pending approvals match your search query."
                                                        : "All submitted quotations in your organization have been resolved or are in draft."
                                                }
                                                icon={
                                                    <ShieldCheck className="w-10 h-10 text-[#16A34A]" />
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    quotations.map((quote) => (
                                        <TableRow
                                            key={quote.id}
                                            className="h-[44px] hover:bg-[#F8FAFC]/80 transition-colors"
                                        >
                                            <TableCell className="font-semibold text-[#0F172A]">
                                                <Link
                                                    href={`/approvals/${quote.id}`}
                                                    className="hover:text-[#1E40AF] hover:underline"
                                                >
                                                    {quote.quoteNumber}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-[#334155] font-medium">
                                                {quote.customer.name}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    type="quotation"
                                                    status={quote.status}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <FinancialNumeral
                                                    amount={quote.total}
                                                />
                                            </TableCell>
                                            <TableCell className="text-[#64748B] text-[12px]">
                                                {formatDate(quote.createdAt, "short")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/approvals/${quote.id}`}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="hover:border-[#1E40AF] hover:text-[#1E40AF]"
                                                    >
                                                        Review Deal
                                                        <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Bar */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                            <span className="text-[12px] text-[#64748B]">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                        pagination.page >= pagination.totalPages ||
                                        isLoading
                                    }
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(pagination.totalPages, p + 1)
                                        )
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
