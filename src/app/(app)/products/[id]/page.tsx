"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { EditProductModal } from "@/components/products/edit-product-modal";
import { ChangeProductStatusModal } from "@/components/products/change-product-status-modal";
import { CreateVariantModal } from "@/components/products/create-variant-modal";
import { ChangeVariantStatusModal } from "@/components/products/change-variant-status-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { formatDateTime } from "@/lib/formatters";
import {
    BILLING_INTERVAL_META,
    BILLING_TYPE_META,
    PRODUCT_MANAGE_ROLES,
} from "@/lib/constants";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Edit3,
    Layers,
    Package,
    Plus,
    ShieldAlert,
    UserCheck,
} from "lucide-react";
import type {
    ProductDetailResponse,
    ProductResponse,
    ProductVariantListResponse,
    ProductVariantResponse,
} from "@/server/modules/products/product.types";

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
    const resolvedParams = use(params);
    const productId = resolvedParams.id;
    const { user: currentUser } = useAuth();

    const [product, setProduct] = useState<ProductResponse | null>(null);
    const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
    const [isCreateVariantModalOpen, setIsCreateVariantModalOpen] = useState<boolean>(false);
    const [statusModalVariant, setStatusModalVariant] = useState<ProductVariantResponse | null>(null);

    const canManageProducts =
        currentUser && PRODUCT_MANAGE_ROLES.includes(currentUser.role);

    // Fetch product details
    useEffect(() => {
        let isMounted = true;

        async function fetchProduct() {
            try {
                const response = await apiClient.get<ProductDetailResponse>(
                    API_ROUTES.PRODUCTS.BY_ID(productId)
                );

                if (isMounted) {
                    setProduct(response.product);
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Failed to load product details.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        fetchProduct();

        return () => {
            isMounted = false;
        };
    }, [productId, refreshTrigger]);

    // Fetch variants
    useEffect(() => {
        let isMounted = true;

        async function fetchVariants() {
            try {
                const response = await apiClient.get<ProductVariantListResponse>(
                    API_ROUTES.PRODUCTS.VARIANTS.LIST(productId)
                );

                if (isMounted) {
                    setVariants(response.variants || []);
                    setIsLoadingVariants(false);
                }
            } catch {
                if (isMounted) {
                    setIsLoadingVariants(false);
                }
            }
        }

        fetchVariants();

        return () => {
            isMounted = false;
        };
    }, [productId, refreshTrigger]);

    const handleRetry = () => {
        setIsLoading(true);
        setIsLoadingVariants(true);
        setErrorMessage(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleProductUpdated = (updated: ProductResponse) => {
        setProduct(updated);
    };

    const handleProductStatusChanged = (targetId: string, nextStatus: boolean) => {
        setProduct((prev) => (prev ? { ...prev, isActive: nextStatus } : null));
    };

    const handleVariantCreated = (newVariant: ProductVariantResponse) => {
        setVariants((prev) => [...prev, newVariant]);
    };

    const handleVariantStatusChanged = (variantId: string, nextStatus: boolean) => {
        setVariants((prev) =>
            prev.map((v) => (v.id === variantId ? { ...v, isActive: nextStatus } : v))
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-6 w-32 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-14 w-full bg-[#E2E8F0] rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="h-24 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="h-24 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="h-24 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="h-24 bg-[#E2E8F0] rounded animate-pulse" />
                </div>
            </div>
        );
    }

    if (errorMessage || !product) {
        return (
            <div className="space-y-6">
                <Link
                    href="/products"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Products
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Product Not Found"
                            message={
                                errorMessage ||
                                "The requested catalog item could not be found."
                            }
                            onRetry={handleRetry}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const billingMeta = BILLING_TYPE_META[product.billingType];
    const intervalMeta = product.billingInterval
        ? BILLING_INTERVAL_META[product.billingInterval]
        : null;

    return (
        <div className="space-y-6">
            {/* Back Navigation */}
            <div>
                <Link
                    href="/products"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Products
                </Link>
            </div>

            {/* Product Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div className="flex items-start gap-3.5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] shrink-0">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[20px] leading-[26px] font-bold text-[#0F172A]">
                                {product.name}
                            </h1>
                            <Badge variant="neutral">{product.category}</Badge>
                            <Badge variant={product.isActive ? "success" : "neutral"} dot>
                                {product.isActive ? "Active in Catalog" : "Inactive"}
                            </Badge>
                        </div>
                        <p className="text-[12px] text-[#64748B] mt-0.5 font-mono">
                            ID: {product.id}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canManageProducts && (
                        <Button
                            variant="outline"
                            size="default"
                            leftIcon={<Edit3 className="w-4 h-4" />}
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            Edit Product
                        </Button>
                    )}

                    {canManageProducts && (
                        <Button
                            variant={product.isActive ? "outline" : "primary"}
                            size="default"
                            leftIcon={
                                product.isActive ? (
                                    <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                                ) : (
                                    <UserCheck className="w-4 h-4" />
                                )
                            }
                            onClick={() => setIsStatusModalOpen(true)}
                        >
                            {product.isActive ? "Deactivate Product" : "Activate Product"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Commercial Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Base List Price */}
                <Card>
                    <CardContent className="p-4">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                            Base List Price
                        </span>
                        <FinancialNumeral
                            amount={product.basePrice}
                            variant="display"
                        />
                        <span className="text-[11px] text-[#64748B] block mt-1">
                            Baseline catalog quotation rate
                        </span>
                    </CardContent>
                </Card>

                {/* Unit Cost */}
                <Card>
                    <CardContent className="p-4">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                            Unit Cost Baseline
                        </span>
                        <FinancialNumeral
                            amount={product.costPrice}
                            variant="display"
                            className="text-[#475569]"
                        />
                        <span className="text-[11px] text-[#64748B] block mt-1">
                            Internal cost floor for governance
                        </span>
                    </CardContent>
                </Card>

                {/* Billing Model */}
                <Card>
                    <CardContent className="p-4">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                            Billing Model
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge
                                variant={
                                    product.billingType === "RECURRING" ? "info" : "neutral"
                                }
                                size="default"
                            >
                                {billingMeta?.label || product.billingType}
                            </Badge>
                            {intervalMeta && (
                                <span className="text-[12px] font-medium text-[#0F172A]">
                                    ({intervalMeta.label})
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-[#64748B] block mt-1.5">
                            {product.billingType === "RECURRING"
                                ? "Subscription renewal contract"
                                : "One-time perpetual deliverable"}
                        </span>
                    </CardContent>
                </Card>

                {/* Catalog Timestamps */}
                <Card>
                    <CardContent className="p-4">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                            Catalog Audit
                        </span>
                        <div className="space-y-1 text-[11px] text-[#64748B] mt-1">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Created: {formatDateTime(product.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Updated: {formatDateTime(product.updatedAt)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product Specifications & Description */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-[14px] font-semibold text-[#0F172A]">
                        Product Specifications & Notes
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                    {product.description ? (
                        <p className="text-[13px] leading-relaxed text-[#334155] whitespace-pre-wrap">
                            {product.description}
                        </p>
                    ) : (
                        <p className="text-[13px] text-[#94A3B8] italic">
                            No product specifications or description provided.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Variants Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[16px] leading-[22px] font-bold text-[#0F172A]">
                            Product Variants & SKUs
                        </h2>
                        <Badge variant="neutral">{variants.length}</Badge>
                    </div>

                    {canManageProducts && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            onClick={() => setIsCreateVariantModalOpen(true)}
                        >
                            Add Variant
                        </Button>
                    )}
                </div>

                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">SKU</TableHead>
                                    <TableHead className="w-[260px]">Variant Name</TableHead>
                                    <TableHead className="w-[160px] text-right">Selling Price</TableHead>
                                    <TableHead className="w-[140px] text-right">Unit Cost</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingVariants ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-[12px] text-[#64748B]">
                                            Loading variants...
                                        </TableCell>
                                    </TableRow>
                                ) : variants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center">
                                            <EmptyState
                                                icon={<Layers className="w-8 h-8 text-[#94A3B8]" />}
                                                title="No variants configured"
                                                description="This product currently has no sub-variants. Deal quotations will use base product rates."
                                                action={
                                                    canManageProducts ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                            onClick={() => setIsCreateVariantModalOpen(true)}
                                                        >
                                                            Add First Variant
                                                        </Button>
                                                    ) : undefined
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    variants.map((v) => (
                                        <TableRow key={v.id} className="hover:bg-[#F8FAFC]">
                                            {/* SKU */}
                                            <TableCell>
                                                <span className="font-mono text-[12px] font-semibold text-[#0F172A] bg-[#F1F5F9] px-2 py-1 rounded">
                                                    {v.sku}
                                                </span>
                                            </TableCell>

                                            {/* Name */}
                                            <TableCell className="text-[13px] font-medium text-[#0F172A]">
                                                {v.name}
                                            </TableCell>

                                            {/* Price */}
                                            <TableCell className="text-right">
                                                <FinancialNumeral
                                                    amount={v.price}
                                                    variant="subtotal"
                                                />
                                            </TableCell>

                                            {/* Cost */}
                                            <TableCell className="text-right">
                                                <FinancialNumeral
                                                    amount={v.cost}
                                                    variant="body"
                                                    className="text-[#64748B]"
                                                />
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Badge
                                                    variant={v.isActive ? "success" : "neutral"}
                                                    dot
                                                >
                                                    {v.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                {canManageProducts && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`text-[12px] ${
                                                            v.isActive
                                                                ? "text-[#64748B] hover:text-[#B91C1C]"
                                                                : "text-[#047857] hover:text-[#065F46]"
                                                        }`}
                                                        title={
                                                            v.isActive
                                                                ? "Deactivate Variant"
                                                                : "Activate Variant"
                                                        }
                                                        onClick={() => setStatusModalVariant(v)}
                                                    >
                                                        {v.isActive ? (
                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <UserCheck className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* Modals */}
            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                product={product}
                onSuccess={handleProductUpdated}
            />

            <ChangeProductStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                product={product}
                onSuccess={handleProductStatusChanged}
            />

            <CreateVariantModal
                isOpen={isCreateVariantModalOpen}
                onClose={() => setIsCreateVariantModalOpen(false)}
                productId={productId}
                onSuccess={handleVariantCreated}
            />

            <ChangeVariantStatusModal
                isOpen={Boolean(statusModalVariant)}
                onClose={() => setStatusModalVariant(null)}
                productId={productId}
                variant={statusModalVariant}
                onSuccess={handleVariantStatusChanged}
            />
        </div>
    );
}
