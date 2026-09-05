import { WarehouseStatus } from "@prisma/client";

export interface WarehouseResponse {
    id: string;
    name: string;
    code: string;
    priority: number;
    status: WarehouseStatus;
    createdAt: string;
    updatedAt: string;
    inventoryCount?: number;
}

export interface WarehousePaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface WarehouseListResponse {
    warehouses: WarehouseResponse[];
    pagination: WarehousePaginationMeta;
}

export interface CreateWarehouseInput {
    name: string;
    code: string;
    priority?: number;
    status?: WarehouseStatus;
}

export interface UpdateWarehouseInput {
    name?: string;
    code?: string;
    priority?: number;
    status?: WarehouseStatus;
}

export interface UpdateWarehouseStatusInput {
    status: WarehouseStatus;
}

export interface ListWarehousesQuery {
    page?: number;
    limit?: number;
    status?: WarehouseStatus;
    search?: string;
}

export interface InventoryProductSummary {
    id: string;
    name: string;
    category: string;
}

export interface InventoryVariantSummary {
    id: string;
    name: string;
    sku: string;
    attributes: Record<string, unknown> | null;
}

export interface InventoryItemResponse {
    id: string;
    warehouseId: string;
    productId: string;
    product: InventoryProductSummary;
    variantId: string | null;
    variant: InventoryVariantSummary | null;
    availableQty: number;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryListResponse {
    inventory: InventoryItemResponse[];
    pagination: WarehousePaginationMeta;
}

export interface CreateInventoryItemInput {
    productId: string;
    variantId?: string | null;
    availableQty: number;
}

export interface UpdateInventoryItemQtyInput {
    availableQty: number;
}

export interface ListInventoryQuery {
    page?: number;
    limit?: number;
    search?: string;
}
