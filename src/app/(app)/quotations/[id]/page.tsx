"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableFooter,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import {
    ArrowLeft,
    Building2,
    FileText,
    Info,
    Layers,
} from "lucide-react";
import type { CanonicalQuotationResponse } from "@/server/modules/quotations/quotation.types";

export default function QuotationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [quotation, setQuotation] = useState<CanonicalQuotationResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState<number>(0);

    const handleRetry = () => {
        setIsLoading(true);
        setErrorMessage(null);
        setRetryCount((prev) => prev + 1);
    };

    useEffect(() => {
        if (!id) return;

        let isMounted = true;

        async function fetchQuotationData() {
            try {
                const data = await apiClient.get<CanonicalQuotationResponse>(
                    API_ROUTES.QUOTATIONS.BY_ID(id)
                );
                if (isMounted) {
                    setQuotation(data);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error ? err.message : "Quotation not found or failed to load.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        fetchQuotationData();

        return () => {
            isMounted = false;
        };
    }, [id, retryCount]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="space-y-2 pb-6 border-b border-[#E2E8F0]">
                    <Skeleton className="h-4 w-48" />
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>

                {/* Metric Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-2"
                        >
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-7 w-36" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    ))}
                </div>

                {/* Content Skeleton */}
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-4">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-80" />
                    <div className="pt-2">
                        <Table>
                            <TableBody>
                                <TableRowSkeleton columns={7} />
                                <TableRowSkeleton columns={7} />
                                <TableRowSkeleton columns={7} />
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        );
    }

    if (errorMessage || !quotation) {
        return (
            <div className="space-y-6">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/quotations")}
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                    Back to Quotations
                </Button>

                <ErrorState
                    title="Unable to open quotation"
                    message={errorMessage || "The requested quotation could not be retrieved."}
                    onRetry={handleRetry}
                />
            </div>
        );
    }

    const { revision, customer } = quotation;
    const lines = revision.lines || [];

    return (
        <div className="space-y-6">
            {/* Standard Enterprise Page Header */}
            <PageHeader
                title={quotation.quoteNumber}
                description="Commercial quotation details, revision snapshot, and line item yield."
                breadcrumbs={[
                    { label: "DealFlow360", href: "/dashboard" },
                    { label: "Quotations", href: "/quotations" },
                    { label: quotation.quoteNumber },
                ]}
                badge={
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                            Rev {revision.revisionNumber}
                        </span>
                        <StatusBadge type="quotation" status={quotation.status} size="sm" />
                        {customer.customerTier && (
                            <StatusBadge type="tier" status={customer.customerTier} size="sm" />
                        )}
                    </div>
                }
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/quotations")}
                        leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                        Back to Quotations
                    </Button>
                }
            />

            {/* Commercial Summary Cards Grid (Authoritative figures from backend) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Net Commercial Total */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Net Commercial Total
                        </span>
                        <div>
                            <FinancialNumeral
                                amount={revision.summary.total}
                                variant="heading"
                                className="text-[#0F172A]"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            Subtotal:{" "}
                            <FinancialNumeral
                                amount={revision.summary.subtotal}
                                variant="metadata"
                            />
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Order Discount */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Order Discount
                        </span>
                        <div>
                            <FinancialNumeral
                                rate={revision.orderDiscountPercent}
                                type="percentage"
                                variant="heading"
                                className="text-[#0F172A]"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            Amount:{" "}
                            <FinancialNumeral
                                amount={revision.summary.orderDiscount}
                                variant="metadata"
                            />
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Blended Margin */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Blended Margin
                        </span>
                        <div>
                            <FinancialNumeral
                                rate={revision.summary.marginPercent}
                                type="percentage"
                                variant="heading"
                                className="text-[#0F172A]"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            Margin Yield:{" "}
                            <FinancialNumeral
                                amount={revision.summary.margin}
                                variant="metadata"
                            />
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Customer Account */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Customer Account
                        </span>
                        <div className="text-[16px] leading-[22px] font-semibold text-[#0F172A] truncate">
                            {customer.name}
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            Tier: {customer.customerTier ? `${customer.customerTier} Tier` : "Standard"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Account & Revision Metadata Strip */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                        <div>
                            <span className="block text-[#64748B] font-medium mb-0.5">
                                Customer Contact
                            </span>
                            <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
                                <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                                <span className="truncate">{customer.name}</span>
                            </div>
                        </div>

                        <div>
                            <span className="block text-[#64748B] font-medium mb-0.5">
                                Active Revision
                            </span>
                            <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
                                <Layers className="w-3.5 h-3.5 text-[#94A3B8]" />
                                <span>
                                    Revision {revision.revisionNumber} ({revision.status})
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="block text-[#64748B] font-medium mb-0.5">
                                Deal Lifecycle
                            </span>
                            <div>
                                <StatusBadge type="quotation" status={quotation.status} size="sm" />
                            </div>
                        </div>

                        <div>
                            <span className="block text-[#64748B] font-medium mb-0.5">
                                Line Item Total
                            </span>
                            <span className="font-semibold text-[#0F172A] tabular-nums">
                                {lines.length} {lines.length === 1 ? "item" : "items"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Revision Lines Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Quotation Line Items</CardTitle>
                            <CardDescription>
                                Catalog items, approved unit pricing, line discounts, and margin yield for Revision {revision.revisionNumber}.
                            </CardDescription>
                        </div>
                        <span className="text-[12px] text-[#64748B] tabular-nums">
                            {lines.length} total {lines.length === 1 ? "line" : "lines"}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {lines.length === 0 ? (
                        <EmptyState
                            icon={<FileText className="w-6 h-6 text-[#94A3B8]" />}
                            title="No line items in this revision yet"
                            description="This draft quotation has no products added yet. Interactive line editing and catalog selection will be unlocked in the Quotation Builder (Phase 4)."
                            className="border-none rounded-none py-12"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Product / Description</TableHead>
                                    <TableHead className="w-[120px]">SKU</TableHead>
                                    <TableHead className="w-[110px]">Category</TableHead>
                                    <TableHead align="right" className="w-[90px]">Qty</TableHead>
                                    <TableHead align="right" className="w-[120px]">Unit Price</TableHead>
                                    <TableHead align="right" className="w-[100px]">Discount</TableHead>
                                    <TableHead align="right" className="w-[130px]">Net Total</TableHead>
                                    <TableHead align="right" className="w-[100px]">Margin</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.lineNumber}>
                                        <TableCell className="font-medium text-[#64748B] tabular-nums">
                                            {line.lineNumber}
                                        </TableCell>
                                        <TableCell className="font-medium text-[#0F172A]">
                                            {line.name}
                                        </TableCell>
                                        <TableCell className="text-[#64748B] font-mono text-[11px]">
                                            {line.sku || "—"}
                                        </TableCell>
                                        <TableCell className="text-[#475569]">
                                            {line.category}
                                        </TableCell>
                                        <TableCell align="right" isNumeric>
                                            {line.quantity}
                                        </TableCell>
                                        <TableCell align="right" isNumeric>
                                            <FinancialNumeral amount={line.unitPrice} />
                                        </TableCell>
                                        <TableCell align="right" isNumeric>
                                            <FinancialNumeral
                                                rate={line.discountPercent}
                                                type="percentage"
                                                coloredDelta={line.discountPercent > 0}
                                            />
                                        </TableCell>
                                        <TableCell align="right" isNumeric className="font-semibold">
                                            <FinancialNumeral amount={line.lineTotal} />
                                        </TableCell>
                                        <TableCell align="right" isNumeric>
                                            <FinancialNumeral
                                                rate={line.marginPercent}
                                                type="percentage"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={7} className="text-right font-semibold">
                                        Revision Total
                                    </TableCell>
                                    <TableCell align="right" isNumeric className="font-bold text-[#1E40AF]">
                                        <FinancialNumeral
                                            amount={revision.summary.total}
                                            variant="subtotal"
                                        />
                                    </TableCell>
                                    <TableCell align="right" isNumeric className="font-semibold">
                                        <FinancialNumeral
                                            rate={revision.summary.marginPercent}
                                            type="percentage"
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Clean, Lightweight Context Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] leading-4 text-[#64748B]">
                <Info className="w-4 h-4 shrink-0 text-[#94A3B8]" />
                <span>
                    Quotation Detail View • Revision {revision.revisionNumber} is currently in{" "}
                    <strong className="text-[#0F172A]">{revision.status}</strong> state. Interactive line item editing and deal workspace operations will activate in Phase 4.
                </span>
            </div>
        </div>
    );
}
