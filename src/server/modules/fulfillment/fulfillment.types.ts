import { FulfillmentLineStatus, FulfillmentStatus } from "@prisma/client";

export interface CreateFulfillmentInput {
    quotationId: string;
}

export interface ListFulfillmentsQuery {
    page?: number;
    limit?: number;
    status?: FulfillmentStatus;
    quotationId?: string;
}

export interface FulfillmentLineAllocationResponse {
    id: string;
    warehouseId: string;
    warehouse: {
        id: string;
        name: string;
        code: string;
        priority: number;
    };
    quantity: number;
    createdAt: string;
}

export interface FulfillmentLineResponse {
    id: string;
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    requiredQty: number;
    allocatedQty: number;
    status: FulfillmentLineStatus;
    allocations: FulfillmentLineAllocationResponse[];
}

export interface CanonicalFulfillmentResponse {
    id: string;
    fulfillmentNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    status: FulfillmentStatus;
    totalRequiredQty: number;
    totalAllocatedQty: number;
    lines: FulfillmentLineResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface FulfillmentSummaryResponse {
    id: string;
    fulfillmentNumber: string;
    quotationId: string;
    quotationNumber: string;
    revisionId: string;
    revisionNumber: number;
    status: FulfillmentStatus;
    totalRequiredQty: number;
    totalAllocatedQty: number;
    lineCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface FulfillmentPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface FulfillmentListResponse {
    fulfillments: FulfillmentSummaryResponse[];
    pagination: FulfillmentPaginationMeta;
}
