import { BillingInterval, BillingType } from "@prisma/client";

export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ProductResponse {
    id: string;
    name: string;
    description: string | null;
    category: string;
    isActive: boolean;
    basePrice: number;
    costPrice: number;
    billingType: BillingType;
    billingInterval: BillingInterval | null;
    createdAt: string;
    updatedAt: string;
    variantsCount?: number;
}

export interface ProductVariantResponse {
    id: string;
    productId: string;
    sku: string;
    name: string;
    price: number;
    cost: number;
    isActive: boolean;
    attributes: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProductListResponse {
    products: ProductResponse[];
    pagination: PaginationMetadata;
}

export interface ProductDetailResponse {
    product: ProductResponse;
}

export interface ProductStatusResponse {
    product: {
        id: string;
        isActive: boolean;
    };
}

export interface ProductArchiveResponse {
    message: string;
}

export interface ProductVariantListResponse {
    variants: ProductVariantResponse[];
}

export interface ProductVariantDetailResponse {
    variant: ProductVariantResponse;
}

export interface ProductVariantStatusResponse {
    variant: {
        id: string;
        isActive: boolean;
    };
}

export interface ProductVariantArchiveResponse {
    message: string;
}

export interface ListProductsQuery {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    billingType?: BillingType;
    billingInterval?: BillingInterval;
    isActive?: boolean;
}

export interface CreateProductInput {
    name: string;
    description?: string | null;
    category: string;
    basePrice: number;
    costPrice: number;
    billingType?: BillingType;
    billingInterval?: BillingInterval | null;
    isActive?: boolean;
}

export interface UpdateProductInput {
    name?: string;
    description?: string | null;
    category?: string;
    basePrice?: number;
    costPrice?: number;
    billingType?: BillingType;
    billingInterval?: BillingInterval | null;
    isActive?: boolean;
}

export interface UpdateProductStatusInput {
    isActive: boolean;
}

export interface CreateVariantInput {
    sku: string;
    name: string;
    price: number;
    cost: number;
    isActive?: boolean;
    attributes?: Record<string, unknown> | null;
}

export interface UpdateVariantInput {
    sku?: string;
    name?: string;
    price?: number;
    cost?: number;
    isActive?: boolean;
    attributes?: Record<string, unknown> | null;
}

export interface UpdateVariantStatusInput {
    isActive: boolean;
}
