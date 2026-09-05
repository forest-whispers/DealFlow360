"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CreateProductModal } from "@/components/products/create-product-modal";
import { ChangeProductStatusModal } from "@/components/products/change-product-status-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import {
    BILLING_INTERVAL_META,
    BILLING_TYPE_META,
    PRODUCT_MANAGE_ROLES,
} from "@/lib/constants";
import {
    ChevronLeft,
    ChevronRight,
    Layers,
    Package,
    Plus,
    RotateCcw,
    Search,
    ShieldAlert,
    UserCheck,
    X,
} from "lucide-react";
import type {
    ProductListResponse,
    ProductResponse,
} from "@/server/modules/products/product.types";

export default function ProductsPage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();

    const [products, setProducts] = useState<ProductResponse[]>([]);
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
    const [billingTypeFilter, setBillingTypeFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [statusModalProduct, setStatusModalProduct] = useState<ProductResponse | null>(null);

    const canManageProducts =
        currentUser && PRODUCT_MANAGE_ROLES.includes(currentUser.role);

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

    const handleBillingTypeFilterChange = (value: string) => {
        setBillingTypeFilter(value);
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
        setBillingTypeFilter("ALL");
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

    // Asynchronous load effect
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const params: Record<string, string | number | boolean> = {
                    page,
                    limit: 20,
                };

                if (billingTypeFilter !== "ALL") {
                    params.billingType = billingTypeFilter;
                }

                if (statusFilter === "ACTIVE") {
                    params.isActive = true;
                } else if (statusFilter === "INACTIVE") {
                    params.isActive = false;
                }

                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const response = await apiClient.get<ProductListResponse>(
                    API_ROUTES.PRODUCTS.LIST,
                    { params }
                );

                if (isMounted) {
                    setProducts(response.products || []);
                    setPagination(
                        response.pagination || {
                            page: 1,
                            limit: 20,
                            total: 0,
                            totalPages: 1,
                        }
                    );
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Failed to load product catalog. Please check network connection.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [page, debouncedSearch, billingTypeFilter, statusFilter, refreshTrigger]);

    const handleProductStatusChanged = (productId: string, nextStatus: boolean) => {
        setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, isActive: nextStatus } : p))
        );
    };

    const handleProductCreated = (newProduct: ProductResponse) => {
        setProducts((prev) => [newProduct, ...prev]);
        setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
    };

    const hasActiveFilters =
        Boolean(search.trim()) || billingTypeFilter !== "ALL" || statusFilter !== "ALL";

    return (
        <div className="space-y-6">
            <PageHeader
                title="Products & Services"
                description="Commercial product catalog, subscription terms, and baseline pricing."
                actions={
                    canManageProducts ? (
                        <Button
                            variant="primary"
                            size="default"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Add Product
                        </Button>
                    ) : undefined
                }
            />

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <Input
                                placeholder="Search by product name or category..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSearchChange("")}
                                            className="hover:text-[#0F172A]"
                                            aria-label="Clear search"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : undefined
                                }
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-44">
                                <Select
                                    value={billingTypeFilter}
                                    onChange={(e) =>
                                        handleBillingTypeFilterChange(e.target.value)
                                    }
                                >
                                    <option value="ALL">All Billing Models</option>
                                    <option value="ONE_TIME">One-Time Purchase</option>
                                    <option value="RECURRING">Recurring Subscription</option>
                                </Select>
                            </div>

                            <div className="w-36">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </Select>
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-[#64748B] hover:text-[#0F172A]"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Product Directory Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[280px]">Product & Category</TableHead>
                                <TableHead className="w-[180px]">Billing Model</TableHead>
                                <TableHead className="w-[140px] text-right">Base List Price</TableHead>
                                <TableHead className="w-[130px] text-right">Unit Cost</TableHead>
                                <TableHead className="w-[110px] text-center">Variants</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[130px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRowSkeleton key={i} columns={7} />
                                ))
                            ) : errorMessage ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center">
                                        <ErrorState
                                            title="Failed to Load Products"
                                            message={errorMessage}
                                            onRetry={handleRetry}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center">
                                        <EmptyState
                                            icon={<Package className="w-10 h-10 text-[#94A3B8]" />}
                                            title={
                                                hasActiveFilters
                                                    ? "No matching products found"
                                                    : "No products in catalog"
                                            }
                                            description={
                                                hasActiveFilters
                                                    ? "Adjust or clear your search and filters to find catalog products."
                                                    : "Add your company's products, services, or subscription licenses to start quoting."
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
                                                ) : canManageProducts ? (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        leftIcon={<Plus className="w-4 h-4" />}
                                                        onClick={() => setIsCreateModalOpen(true)}
                                                    >
                                                        Add First Product
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((prod) => {
                                    const billingMeta = BILLING_TYPE_META[prod.billingType];
                                    const intervalMeta = prod.billingInterval
                                        ? BILLING_INTERVAL_META[prod.billingInterval]
                                        : null;

                                    return (
                                        <TableRow
                                            key={prod.id}
                                            className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                                            onClick={() => router.push(`/products/${prod.id}`)}
                                        >
                                            {/* Product Name & Category */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] shrink-0">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/products/${prod.id}`}
                                                            className="text-[13px] font-medium text-[#0F172A] hover:text-[#1E40AF] truncate block"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {prod.name}
                                                        </Link>
                                                        <span className="text-[11px] text-[#64748B] truncate block">
                                                            {prod.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Billing Model */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge
                                                        variant={
                                                            prod.billingType === "RECURRING"
                                                                ? "info"
                                                                : "neutral"
                                                        }
                                                    >
                                                        {billingMeta?.label || prod.billingType}
                                                    </Badge>
                                                    {intervalMeta && (
                                                        <span className="text-[11px] text-[#64748B]">
                                                            / {intervalMeta.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Base List Price */}
                                            <TableCell className="text-right">
                                                <FinancialNumeral
                                                    amount={prod.basePrice}
                                                    variant="subtotal"
                                                />
                                            </TableCell>

                                            {/* Unit Cost */}
                                            <TableCell className="text-right">
                                                <FinancialNumeral
                                                    amount={prod.costPrice}
                                                    variant="body"
                                                    className="text-[#64748B]"
                                                />
                                            </TableCell>

                                            {/* Variants Count */}
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#475569]">
                                                    <Layers className="w-3 h-3 text-[#94A3B8]" />
                                                    {prod.variantsCount ?? 0}
                                                </span>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Badge
                                                    variant={prod.isActive ? "success" : "neutral"}
                                                    dot
                                                >
                                                    {prod.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div
                                                    className="flex items-center justify-end gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Link href={`/products/${prod.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[12px] text-[#1E40AF] hover:text-[#1D4ED8]"
                                                        >
                                                            View
                                                        </Button>
                                                    </Link>

                                                    {canManageProducts && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`text-[12px] ${
                                                                prod.isActive
                                                                    ? "text-[#64748B] hover:text-[#B91C1C]"
                                                                    : "text-[#047857] hover:text-[#065F46]"
                                                            }`}
                                                            title={
                                                                prod.isActive
                                                                    ? "Deactivate Product"
                                                                    : "Activate Product"
                                                            }
                                                            onClick={() => setStatusModalProduct(prod)}
                                                        >
                                                            {prod.isActive ? (
                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {!isLoading && !errorMessage && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
                        <div className="text-[12px] text-[#64748B]">
                            Showing{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {(pagination.page - 1) * pagination.limit + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-[#0F172A]">
                                {pagination.total}
                            </span>{" "}
                            products
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page <= 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-[12px] text-[#475569] font-medium px-1">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <CreateProductModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleProductCreated}
            />

            <ChangeProductStatusModal
                isOpen={Boolean(statusModalProduct)}
                onClose={() => setStatusModalProduct(null)}
                product={statusModalProduct}
                onSuccess={handleProductStatusChanged}
            />
        </div>
    );
}
