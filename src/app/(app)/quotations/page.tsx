"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { CreateQuotationModal } from "@/components/quotations/create-quotation-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Plus,
    RotateCcw,
    Search,
    X,
} from "lucide-react";
import type {
    QuotationCardResponse,
    QuotationListResponse,
} from "@/server/modules/quotations/quotation.types";

export default function QuotationsPage() {
    const router = useRouter();

    const [quotations, setQuotations] = useState<QuotationCardResponse[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters & Search
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setIsLoading(true);
        setPage(1);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setIsLoading(true);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("ALL");
        setIsLoading(true);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setIsLoading(true);
        setPage(newPage);
    };

    const handleRetry = () => {
        setIsLoading(true);
        setErrorMessage(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    // Fetch quotations asynchronously without synchronous setState in effect body
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const params: Record<string, string | number> = {
                    page,
                    limit: 20,
                };

                if (statusFilter !== "ALL") {
                    params.status = statusFilter;
                }

                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const data = await apiClient.get<QuotationListResponse>(
                    API_ROUTES.QUOTATIONS.LIST,
                    { params }
                );

                if (isMounted) {
                    setQuotations(data.quotations || []);
                    setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error ? err.message : "Failed to load quotations pipeline";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [page, debouncedSearch, statusFilter, refreshTrigger]);

    const hasActiveFilters = search.trim() !== "" || statusFilter !== "ALL";

    // Item range calculation for enterprise pagination info
    const startItem =
        pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <div className="space-y-6">
            {/* Standard Enterprise Page Header */}
            <PageHeader
                title="Quotations"
                description="Commercial pipeline, revision lifecycles, and deal tracking across customer accounts."
                breadcrumbs={[
                    { label: "DealFlow360", href: "/dashboard" },
                    { label: "Quotations" },
                ]}
                actions={
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                        New Quotation
                    </Button>
                }
            />

            {/* Filter & Search Toolbar */}
            <Card>
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search & Status Filter Group */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                            {/* Search Input with Debounce & Clear Icon */}
                            <div className="w-full sm:max-w-xs">
                                <Input
                                    type="text"
                                    placeholder="Search by quote # or customer..."
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                                    rightIcon={
                                        search ? (
                                            <button
                                                type="button"
                                                onClick={() => handleSearchChange("")}
                                                className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                                                aria-label="Clear search input"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        ) : undefined
                                    }
                                />
                            </div>

                            {/* Status Filter Dropdown */}
                            <div className="w-full sm:w-52">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                                    aria-label="Filter by quotation status"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="PENDING_APPROVAL">Pending Approval</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="SENT">Sent</option>
                                    <option value="UNDER_NEGOTIATION">Under Negotiation</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                </Select>
                            </div>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="shrink-0"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>

                        {/* Pipeline Count Indicator */}
                        <div className="text-[12px] leading-4 text-[#64748B] tabular-nums shrink-0 self-end sm:self-center">
                            {isLoading ? (
                                <span>Loading records...</span>
                            ) : (
                                <span>
                                    Showing <strong>{startItem}–{endItem}</strong> of{" "}
                                    <strong>{pagination.total}</strong> quotes
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error State if fetch failed */}
            {errorMessage && !isLoading && (
                <ErrorState
                    title="Failed to load quotations"
                    message={errorMessage}
                    onRetry={handleRetry}
                />
            )}

            {/* Dense Enterprise Quotations Table */}
            {!errorMessage && (
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Quotation #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="w-[170px]">Status</TableHead>
                                <TableHead align="right" className="w-[160px]">
                                    Total Commercial Value
                                </TableHead>
                                <TableHead className="w-[140px]">Last Updated</TableHead>
                                <TableHead align="right" className="w-[110px]">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <TableRowSkeleton columns={6} />
                                    <TableRowSkeleton columns={6} />
                                    <TableRowSkeleton columns={6} />
                                    <TableRowSkeleton columns={6} />
                                    <TableRowSkeleton columns={6} />
                                </>
                            ) : quotations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="p-0">
                                        {hasActiveFilters ? (
                                            <EmptyState
                                                icon={<Search className="w-6 h-6 text-[#94A3B8]" />}
                                                title="No matching quotations"
                                                description="No quotations match your current search query or status filter. Try clearing or relaxing your filters."
                                                action={
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleClearFilters}
                                                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                                    >
                                                        Reset Filters
                                                    </Button>
                                                }
                                                className="border-none rounded-none py-12"
                                            />
                                        ) : (
                                            <EmptyState
                                                icon={<FileText className="w-6 h-6 text-[#94A3B8]" />}
                                                title="No quotations created yet"
                                                description="Start by initializing a new commercial quotation for an active customer account."
                                                action={
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => setIsCreateModalOpen(true)}
                                                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                    >
                                                        New Quotation
                                                    </Button>
                                                }
                                                className="border-none rounded-none py-12"
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quotations.map((quote) => (
                                    <TableRow
                                        key={quote.id}
                                        isClickable
                                        onClick={() => router.push(`/quotations/${quote.id}`)}
                                    >
                                        {/* Quote Number */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-[#94A3B8] shrink-0" />
                                                <span className="font-semibold text-[#1E40AF] hover:underline cursor-pointer">
                                                    {quote.quoteNumber}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Customer */}
                                        <TableCell>
                                            <span className="font-medium text-[#0F172A]">
                                                {quote.customer.name}
                                            </span>
                                        </TableCell>

                                        {/* Quotation Status */}
                                        <TableCell>
                                            <StatusBadge
                                                type="quotation"
                                                status={quote.status}
                                                size="sm"
                                            />
                                        </TableCell>

                                        {/* Total Financial Value */}
                                        <TableCell align="right" isNumeric>
                                            <FinancialNumeral
                                                amount={quote.total}
                                                variant="body"
                                                className="font-semibold text-[#0F172A]"
                                            />
                                        </TableCell>

                                        {/* Updated At */}
                                        <TableCell>
                                            <span
                                                className="text-[12px] text-[#475569] cursor-help"
                                                title={formatDateTime(quote.updatedAt)}
                                            >
                                                {formatRelativeTime(quote.updatedAt)}
                                            </span>
                                        </TableCell>

                                        {/* Row Actions */}
                                        <TableCell align="right">
                                            <div
                                                className="flex items-center justify-end"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Link
                                                    href={`/quotations/${quote.id}`}
                                                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1E40AF] hover:text-[#1E3A8A] transition-colors p-1 rounded-sm"
                                                >
                                                    <span>View Deal</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Server-Backed Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <p className="text-[12px] text-[#64748B] tabular-nums">
                                Page <strong>{pagination.page}</strong> of{" "}
                                <strong>{pagination.totalPages}</strong>
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages || isLoading}
                                    onClick={() => handlePageChange(Math.min(pagination.page + 1, pagination.totalPages))}
                                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Quotation Modal */}
            <CreateQuotationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => handleRetry()}
            />
        </div>
    );
}
