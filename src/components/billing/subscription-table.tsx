"use client";

import React from "react";
import Link from "next/link";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import { BILLING_INTERVAL_META } from "@/lib/constants";
import { ArrowRight, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import type { SubscriptionSummaryResponse } from "@/server/modules/billing/billing.types";

export interface SubscriptionTableProps {
    subscriptions: SubscriptionSummaryResponse[];
    isLoading: boolean;
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
}

export function SubscriptionTable({
    subscriptions,
    isLoading,
    page,
    totalPages,
    total,
    onPageChange,
}: SubscriptionTableProps) {
    if (isLoading) {
        return (
            <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">Subscription #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Quotation</TableHead>
                            <TableHead>Interval</TableHead>
                            <TableHead className="text-right">Recurring</TableHead>
                            <TableHead className="text-center">Lines</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Next Bill Date</TableHead>
                            <TableHead className="w-[90px] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <TableRowSkeleton key={idx} columns={10} />
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (subscriptions.length === 0) {
        return (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-8">
                <EmptyState
                    icon={<Repeat className="w-8 h-8 text-[#94A3B8]" />}
                    title="No subscriptions found"
                    description="There are no active or recurring subscriptions matching the filter criteria."
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#F8FAFC]">
                            <TableHead className="w-[140px] text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Subscription #
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Customer
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Quotation
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Interval
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569] text-right">
                                Recurring
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569] text-center">
                                Lines
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Status
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Start Date
                            </TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-[#475569]">
                                Next Bill Date
                            </TableHead>
                            <TableHead className="w-[90px] text-[11px] uppercase tracking-wider font-semibold text-[#475569] text-right">
                                Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptions.map((sub) => {
                            const intervalLabel =
                                BILLING_INTERVAL_META[sub.billingInterval]?.label ??
                                sub.billingInterval;

                            return (
                                <TableRow
                                    key={sub.id}
                                    className="hover:bg-[#F8FAFC] transition-colors"
                                >
                                    <TableCell className="font-mono text-[12px] font-medium text-[#1E40AF]">
                                        <Link
                                            href={`/subscriptions/${sub.id}`}
                                            className="hover:underline flex items-center gap-1 font-semibold"
                                        >
                                            {sub.subscriptionNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-[13px] font-medium text-[#0F172A]">
                                        {sub.customerName}
                                    </TableCell>
                                    <TableCell className="text-[12px] text-[#475569]">
                                        <Link
                                            href={`/quotations/${sub.quotationId}`}
                                            className="hover:text-[#1E40AF] hover:underline"
                                        >
                                            {sub.quotationNumber}{" "}
                                            <span className="text-[#94A3B8]">
                                                (r{sub.revisionNumber})
                                            </span>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="info" size="sm">
                                            {intervalLabel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-[13px] font-semibold text-[#0F172A]">
                                        <FinancialNumeral value={sub.recurringAmount} />
                                    </TableCell>
                                    <TableCell className="text-center text-[12px] text-[#64748B]">
                                        {sub.lineCount}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            type="subscription"
                                            status={sub.status}
                                        />
                                    </TableCell>
                                    <TableCell className="text-[12px] text-[#64748B]">
                                        {formatDate(sub.startDate, "short")}
                                    </TableCell>
                                    <TableCell className="text-[12px] text-[#64748B]">
                                        {formatDate(sub.nextBillingDate, "short")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/subscriptions/${sub.id}`}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[12px] text-[#475569] hover:text-[#1E40AF]"
                                            >
                                                View
                                                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-1 text-[12px] text-[#64748B]">
                    <span>
                        Showing {subscriptions.length} of {total} subscriptions
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => onPageChange(page - 1)}
                            className="h-8 px-2.5 text-[12px]"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            Previous
                        </Button>
                        <span className="font-medium text-[#0F172A]">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange(page + 1)}
                            className="h-8 px-2.5 text-[12px]"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
