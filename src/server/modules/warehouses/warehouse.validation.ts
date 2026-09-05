import { z } from "zod";
import { WarehouseStatus, WAREHOUSE_PAGINATION } from "./warehouse.constants";

export const warehouseIdParamSchema = z.object({
    id: z.string().trim().min(1, "Warehouse ID is required"),
});

export const inventoryIdParamSchema = z.object({
    id: z.string().trim().min(1, "Warehouse ID is required"),
    inventoryId: z.string().trim().min(1, "Inventory ID is required"),
});

export const createWarehouseSchema = z.object({
    name: z.string().trim().min(1, "Warehouse name is required").max(100),
    code: z.string().trim().min(1, "Warehouse code is required").max(50),
    priority: z
        .number()
        .int("Priority must be an integer")
        .min(1, "Priority must be at least 1")
        .default(1),
    status: z.nativeEnum(WarehouseStatus).default(WarehouseStatus.ACTIVE),
});

export const updateWarehouseSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        code: z.string().trim().min(1).max(50).optional(),
        priority: z
            .number()
            .int("Priority must be an integer")
            .min(1, "Priority must be at least 1")
            .optional(),
        status: z.nativeEnum(WarehouseStatus).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided to update.",
    });

export const updateWarehouseStatusSchema = z.object({
    status: z.nativeEnum(WarehouseStatus),
});

export const listWarehousesSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(WAREHOUSE_PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(WAREHOUSE_PAGINATION.MAX_LIMIT)
        .default(WAREHOUSE_PAGINATION.DEFAULT_LIMIT),
    status: z.nativeEnum(WarehouseStatus).optional(),
    search: z.string().trim().optional(),
});

export const createInventoryItemSchema = z.object({
    productId: z.string().trim().min(1, "Product ID is required"),
    variantId: z.string().trim().nullable().optional(),
    availableQty: z
        .number()
        .int("Available quantity must be an integer")
        .min(0, "Available quantity cannot be negative"),
});

export const updateInventoryItemQtySchema = z.object({
    availableQty: z
        .number()
        .int("Available quantity must be an integer")
        .min(0, "Available quantity cannot be negative"),
});

export const listInventorySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(WAREHOUSE_PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(WAREHOUSE_PAGINATION.MAX_LIMIT)
        .default(WAREHOUSE_PAGINATION.DEFAULT_LIMIT),
    search: z.string().trim().optional(),
});
