"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import {
    AlertCircle,
    Check,
    Layers,
    Package,
    Percent,
    Search,
} from "lucide-react";
import type {
    ProductListResponse,
    ProductResponse,
    ProductVariantListResponse,
    ProductVariantResponse,
} from "@/server/modules/products/product.types";

export interface NewQuotationLineData {
    productId: string;
    variantId?: string | null;
    name: string;
    sku?: string | null;
    category: string;
    unitPrice: number;
    unitCost: number;
    quantity: number;
    discountPercent: number;
}

export interface AddLineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddLine: (item: NewQuotationLineData) => void;
}

export function AddLineModal({
    isOpen,
    onClose,
    onAddLine,
}: AddLineModalProps) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // Selected product & variant
    const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
    const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);

    // Pricing & line inputs
    const [quantity, setQuantity] = useState("1");
    const [discountPercent, setDiscountPercent] = useState("0");
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleClose = () => {
        setSearch("");
        setDebouncedSearch("");
        setSelectedProduct(null);
        setVariants([]);
        setSelectedVariantId("");
        setQuantity("1");
        setDiscountPercent("0");
        setValidationError(null);
        onClose();
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    // Fetch active products
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoadingProducts(true);
            try {
                const params: Record<string, string | number | boolean> = {
                    isActive: true,
                    limit: 30,
                };
                if (debouncedSearch.trim()) {
                    params.search = debouncedSearch.trim();
                }

                const response = await apiClient.get<ProductListResponse>(
                    API_ROUTES.PRODUCTS.LIST,
                    { params }
                );

                if (isMounted) {
                    setProducts(response.products || []);
                }
            } catch {
                if (isMounted) {
                    setProducts([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProducts(false);
                }
            }
        }, 150);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isOpen, debouncedSearch]);

    // Fetch variants when a product is selected
    const handleSelectProduct = async (product: ProductResponse) => {
        setSelectedProduct(product);
        setSelectedVariantId("");
        setValidationError(null);

        if (product.variantsCount && product.variantsCount > 0) {
            setIsLoadingVariants(true);
            try {
                const response = await apiClient.get<ProductVariantListResponse>(
                    API_ROUTES.PRODUCTS.VARIANTS.LIST(product.id)
                );
                const activeVariants = (response.variants || []).filter((v) => v.isActive);
                setVariants(activeVariants);
                if (activeVariants.length > 0) {
                    setSelectedVariantId(activeVariants[0].id);
                }
            } catch {
                setVariants([]);
            } finally {
                setIsLoadingVariants(false);
            }
        } else {
            setVariants([]);
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProduct) {
            setValidationError("Please select a catalog product.");
            return;
        }

        const parsedQty = parseInt(quantity, 10);
        if (isNaN(parsedQty) || parsedQty < 1) {
            setValidationError("Quantity must be an integer greater than 0.");
            return;
        }

        const parsedDiscount = parseFloat(discountPercent);
        if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
            setValidationError("Discount must be between 0% and 100%.");
            return;
        }

        let variant: ProductVariantResponse | null = null;
        if (selectedVariantId && variants.length > 0) {
            variant = variants.find((v) => v.id === selectedVariantId) || null;
        }

        const unitPrice = variant ? variant.price : selectedProduct.basePrice;
        const unitCost = variant ? variant.cost : selectedProduct.costPrice;
        const sku = variant ? variant.sku : null;
        const name = variant
            ? `${selectedProduct.name} - ${variant.name}`
            : selectedProduct.name;

        onAddLine({
            productId: selectedProduct.id,
            variantId: variant ? variant.id : null,
            name,
            sku,
            category: selectedProduct.category,
            unitPrice,
            unitCost,
            quantity: parsedQty,
            discountPercent: parsedDiscount,
        });

        handleClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Line Item"
            description="Select a catalog product or SKU variant to add to this quotation."
            maxWidth="lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!selectedProduct}
                        onClick={handleAdd}
                    >
                        Add to Quotation
                    </Button>
                </>
            }
        >
            <form onSubmit={handleAdd} className="space-y-4">
                {validationError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* Product Search Input */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Search Catalog
                    </label>
                    <Input
                        placeholder="Search product name or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                    />
                </div>

                {/* Product Selection List */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Select Product ({products.length} available)
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-[#E2E8F0] divide-y divide-[#F1F5F9] bg-white">
                        {isLoadingProducts ? (
                            <div className="p-4 text-center text-[12px] text-[#64748B]">
                                Loading active products...
                            </div>
                        ) : products.length === 0 ? (
                            <div className="p-4 text-center text-[12px] text-[#64748B]">
                                No active products found matching search.
                            </div>
                        ) : (
                            products.map((p) => {
                                const isSelected = selectedProduct?.id === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectProduct(p)}
                                        className={`flex items-center justify-between p-2.5 text-[12px] cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-[#EFF6FF] text-[#1E40AF]"
                                                : "hover:bg-[#F8FAFC] text-[#0F172A]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Package className="w-4 h-4 text-[#64748B] shrink-0" />
                                            <div className="truncate">
                                                <span className="font-semibold">{p.name}</span>
                                                <span className="text-[11px] text-[#64748B] ml-2">
                                                    ({p.category})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {p.variantsCount && p.variantsCount > 0 ? (
                                                <Badge variant="neutral" size="sm">
                                                    <Layers className="w-3 h-3 mr-1" />
                                                    {p.variantsCount} variants
                                                </Badge>
                                            ) : (
                                                <FinancialNumeral
                                                    amount={p.basePrice}
                                                    variant="subtotal"
                                                />
                                            )}
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-[#1E40AF]" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Variant Selection (if product has variants) */}
                {selectedProduct && variants.length > 0 && (
                    <div className="pt-2 border-t border-[#E2E8F0]">
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Select SKU Variant <span className="text-[#B91C1C]">*</span>
                        </label>
                        {isLoadingVariants ? (
                            <p className="text-[12px] text-[#64748B]">Loading variants...</p>
                        ) : (
                            <Select
                                value={selectedVariantId}
                                onChange={(e) => setSelectedVariantId(e.target.value)}
                            >
                                {variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.sku} — {v.name} (
                                        {v.price.toLocaleString("en-IN", {
                                            style: "currency",
                                            currency: "INR",
                                        })}
                                        )
                                    </option>
                                ))}
                            </Select>
                        )}
                    </div>
                )}

                {/* Commercial Inputs: Quantity & Line Discount */}
                {selectedProduct && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
                        <div>
                            <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                                Quantity <span className="text-[#B91C1C]">*</span>
                            </label>
                            <Input
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                isNumeric
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                                Initial Line Discount (%)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                rightIcon={<Percent className="w-3.5 h-3.5" />}
                                isNumeric
                            />
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
}
