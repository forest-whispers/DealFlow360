"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { formatRelativeTime } from "@/lib/formatters";
import { ArrowRight, Search, X, ChevronLeft, ChevronRight, FileText, RotateCcw } from "lucide-react";
import type {
    PortalQuotationCardResponse,
    PortalQuotationListResponse,
} from "@/server/modules/negotiation/negotiation.types";

const PAGE_SIZE = 10;

export default function CustomerQuotationsPortalPage() {
    const [quotations, setQuotations] = useState<PortalQuotationCardResponse[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const res = await apiClient.get<PortalQuotationListResponse>(
                    API_ROUTES.PORTAL.QUOTATIONS.LIST,
                    {
                        params: {
                            page: currentPage,
                            limit: PAGE_SIZE,
                        },
                    }
                );

                if (isMounted) {
                    setQuotations(res.quotations || []);
                    setPagination(
                        res.pagination || {
                            page: currentPage,
                            limit: PAGE_SIZE,
                            total: res.quotations?.length || 0,
                            totalPages: 1,
                        }
                    );
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    if (err instanceof ApiClientError) {
                        setErrorMessage(err.message);
                    } else if (err instanceof Error) {
                        setErrorMessage(err.message);
                    } else {
                        setErrorMessage("Unable to load quotations. Please try again.");
                    }
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [currentPage, refreshTrigger]);

    const handlePageChange = (newPage: number) => {
        setIsLoading(true);
        setCurrentPage(newPage);
    };

    const handleRetry = () => {
        setIsLoading(true);
        setErrorMessage(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    // Client-side filtering for search and status
    const filteredQuotations = quotations.filter((q) => {
        if (statusFilter !== "ALL" && q.status !== statusFilter) {
            return false;
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            return q.quoteNumber.toLowerCase().includes(query);
        }
        return true;
    });

    const hasActiveFilters = statusFilter !== "ALL" || searchQuery.trim().length > 0;

    const handleClearFilters = () => {
        setStatusFilter("ALL");
        setSearchQuery("");
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Commercial Quotations"
                description="Review commercial proposals, negotiate line items, and confirm approved orders."
                breadcrumbs={[
                    { label: "Customer Portal", href: "/portal/quotations" },
                    { label: "Quotations" },
                ]}
            />

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Input
                                placeholder="Search by quotation number (e.g. QT-)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
                                rightIcon={
                                    searchQuery ? (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                                            aria-label="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : undefined
                                }
                            />
                        </div>

                        <div className="w-full sm:w-56">
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                aria-label="Filter by status"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SENT">Ready for Review (Sent)</option>
                                <option value="UNDER_NEGOTIATION">Under Negotiation</option>
                                <option value="APPROVED">Approved Terms</option>
                                <option value="CONFIRMED">Confirmed Deals</option>
                            </Select>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                className="shrink-0 text-[12px]"
                            >
                                Reset Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error State */}
            {errorMessage && !isLoading && (
                <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-[13px] text-[#991B1B]">
                            Failed to load quotations
                        </p>
                        <p className="text-[12px] text-[#B91C1C] mt-0.5">{errorMessage}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Quotations List Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Commercial Proposals</CardTitle>
                    <CardDescription>
                        Quotations prepared by your account team awaiting review or confirmation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-28" />
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : filteredQuotations.length === 0 ? (
                        <div className="py-12">
                            <EmptyState
                                icon={<FileText className="w-10 h-10 text-[#94A3B8]" />}
                                title={hasActiveFilters ? "No matching quotations" : "No active quotations"}
                                description={
                                    hasActiveFilters
                                        ? "Try adjusting your filters or search keywords."
                                        : "You do not have any quotations shared with you at this time."
                                }
                                action={
                                    hasActiveFilters ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearFilters}
                                        >
                                            Clear Filters
                                        </Button>
                                    ) : undefined
                                }
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Quotation #</TableHead>
                                        <TableHead>Revision</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date Issued</TableHead>
                                        <TableHead align="right">Total Value</TableHead>
                                        <TableHead align="right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotations.map((quote) => {
                                        const isConfirmed = quote.status === "CONFIRMED";

                                        return (
                                            <TableRow key={quote.id}>
                                                <TableCell className="font-semibold text-[#1E40AF]">
                                                    <Link
                                                        href={`/portal/quotations/${quote.id}`}
                                                        className="hover:underline"
                                                    >
                                                        {quote.quoteNumber}
                                                    </Link>
                                                </TableCell>

                                                <TableCell className="font-medium text-[#475569]">
                                                    Rev {quote.revisionNumber}
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge
                                                        type="quotation"
                                                        status={quote.status}
                                                        size="sm"
                                                    />
                                                </TableCell>

                                                <TableCell className="text-[#475569] text-[12px]">
                                                    {formatRelativeTime(quote.createdAt)}
                                                </TableCell>

                                                <TableCell align="right" className="font-bold text-[#0F172A] tabular-nums">
                                                    <FinancialNumeral
                                                        amount={quote.total}
                                                        currency="INR"
                                                    />
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Link href={`/portal/quotations/${quote.id}`}>
                                                        <Button
                                                            variant={isConfirmed ? "ghost" : "outline"}
                                                            size="sm"
                                                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                                                            className="text-[12px]"
                                                        >
                                                            {isConfirmed ? "View Deal" : "Review Proposal"}
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Server Pagination */}
            {!isLoading && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-[12px] text-[#64748B] tabular-nums">
                        Page <strong>{pagination.page}</strong> of{" "}
                        <strong>{pagination.totalPages}</strong> ({pagination.total} total)
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
    );
}
