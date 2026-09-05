import { Prisma, Warehouse, InventoryItem, Product, ProductVariant } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { WarehouseStatus, WAREHOUSE_PAGINATION } from "./warehouse.constants";
import type {
    CreateInventoryItemInput,
    CreateWarehouseInput,
    InventoryItemResponse,
    InventoryListResponse,
    ListInventoryQuery,
    ListWarehousesQuery,
    UpdateInventoryItemQtyInput,
    UpdateWarehouseInput,
    WarehouseListResponse,
    WarehouseResponse,
} from "./warehouse.types";

export type WarehouseWithCount = Warehouse & {
    _count?: {
        inventory: number;
    };
};

export type InventoryItemWithRelations = InventoryItem & {
    product: Pick<Product, "id" | "name" | "category">;
    variant: Pick<ProductVariant, "id" | "name" | "sku" | "attributes"> | null;
};

export function mapWarehouseToResponse(
    record: WarehouseWithCount,
): WarehouseResponse {
    const res: WarehouseResponse = {
        id: record.id,
        name: record.name,
        code: record.code,
        priority: record.priority,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };

    if (record._count?.inventory !== undefined) {
        res.inventoryCount = record._count.inventory;
    }

    return res;
}

export function mapInventoryItemToResponse(
    record: InventoryItemWithRelations,
): InventoryItemResponse {
    let attributes: Record<string, unknown> | null = null;
    if (
        record.variant?.attributes !== null &&
        typeof record.variant?.attributes === "object" &&
        !Array.isArray(record.variant?.attributes)
    ) {
        attributes = record.variant.attributes as Record<string, unknown>;
    }

    return {
        id: record.id,
        warehouseId: record.warehouseId,
        productId: record.productId,
        product: {
            id: record.product.id,
            name: record.product.name,
            category: record.product.category,
        },
        variantId: record.variantId,
        variant: record.variant
            ? {
                  id: record.variant.id,
                  name: record.variant.name,
                  sku: record.variant.sku,
                  attributes,
              }
            : null,
        availableQty: record.availableQty,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class WarehouseService {
    // ==========================================
    // 1. List Warehouses
    // ==========================================
    async listWarehouses(
        user: AuthenticatedUser,
        query: ListWarehousesQuery,
    ): Promise<WarehouseListResponse> {
        const page = query.page ?? WAREHOUSE_PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? WAREHOUSE_PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.WarehouseWhereInput = {
            organizationId: user.organizationId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
            ];
        }

        const [total, records] = await prisma.$transaction([
            prisma.warehouse.count({ where }),
            prisma.warehouse.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { priority: "asc" },
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
                include: {
                    _count: {
                        select: { inventory: true },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            warehouses: records.map(mapWarehouseToResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    // ==========================================
    // 2. Get Warehouse By ID
    // ==========================================
    async getWarehouseById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<WarehouseResponse> {
        const record = await prisma.warehouse.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
            include: {
                _count: {
                    select: { inventory: true },
                },
            },
        });

        if (!record) {
            throw new NotFoundError("Warehouse not found.");
        }

        return mapWarehouseToResponse(record);
    }

    // ==========================================
    // 3. Create Warehouse
    // ==========================================
    async createWarehouse(
        user: AuthenticatedUser,
        input: CreateWarehouseInput,
    ): Promise<WarehouseResponse> {
        const code = input.code.trim().toUpperCase();

        const existing = await prisma.warehouse.findFirst({
            where: {
                organizationId: user.organizationId,
                code,
            },
            select: { id: true },
        });

        if (existing) {
            throw new ConflictError(
                "Warehouse code already exists in this organization.",
            );
        }

        const record = await prisma.warehouse.create({
            data: {
                name: input.name.trim(),
                code,
                priority: input.priority ?? 1,
                status: input.status ?? WarehouseStatus.ACTIVE,
                organizationId: user.organizationId,
            },
            include: {
                _count: {
                    select: { inventory: true },
                },
            },
        });

        return mapWarehouseToResponse(record);
    }

    // ==========================================
    // 4. Update Warehouse
    // ==========================================
    async updateWarehouse(
        user: AuthenticatedUser,
        id: string,
        input: UpdateWarehouseInput,
    ): Promise<WarehouseResponse> {
        const existing = await prisma.warehouse.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
            select: { id: true, code: true },
        });

        if (!existing) {
            throw new NotFoundError("Warehouse not found.");
        }

        let newCode: string | undefined;
        if (input.code) {
            newCode = input.code.trim().toUpperCase();
            if (newCode !== existing.code) {
                const duplicate = await prisma.warehouse.findFirst({
                    where: {
                        organizationId: user.organizationId,
                        code: newCode,
                    },
                    select: { id: true },
                });

                if (duplicate) {
                    throw new ConflictError(
                        "Warehouse code already exists in this organization.",
                    );
                }
            }
        }

        const updated = await prisma.warehouse.update({
            where: { id: existing.id },
            data: {
                ...(input.name !== undefined && { name: input.name.trim() }),
                ...(newCode !== undefined && { code: newCode }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.status !== undefined && { status: input.status }),
            },
            include: {
                _count: {
                    select: { inventory: true },
                },
            },
        });

        return mapWarehouseToResponse(updated);
    }

    // ==========================================
    // 5. Update Warehouse Status
    // ==========================================
    async updateWarehouseStatus(
        user: AuthenticatedUser,
        id: string,
        status: WarehouseStatus,
    ): Promise<WarehouseResponse> {
        const existing = await prisma.warehouse.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundError("Warehouse not found.");
        }

        const updated = await prisma.warehouse.update({
            where: { id: existing.id },
            data: { status },
            include: {
                _count: {
                    select: { inventory: true },
                },
            },
        });

        return mapWarehouseToResponse(updated);
    }

    // ==========================================
    // 6. List Warehouse Inventory
    // ==========================================
    async listWarehouseInventory(
        user: AuthenticatedUser,
        warehouseId: string,
        query: ListInventoryQuery,
    ): Promise<InventoryListResponse> {
        const warehouse = await prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                organizationId: user.organizationId,
            },
            select: { id: true },
        });

        if (!warehouse) {
            throw new NotFoundError("Warehouse not found.");
        }

        const page = query.page ?? WAREHOUSE_PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? WAREHOUSE_PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.InventoryItemWhereInput = {
            warehouseId,
        };

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { product: { name: { contains: search, mode: "insensitive" } } },
                { product: { category: { contains: search, mode: "insensitive" } } },
                { variant: { name: { contains: search, mode: "insensitive" } } },
                { variant: { sku: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [total, records] = await prisma.$transaction([
            prisma.inventoryItem.count({ where }),
            prisma.inventoryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { product: { name: "asc" } },
                    { createdAt: "asc" },
                ],
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                        },
                    },
                    variant: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            attributes: true,
                        },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            inventory: records.map(mapInventoryItemToResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    // ==========================================
    // 7. Create Warehouse Inventory Item
    // ==========================================
    async createWarehouseInventory(
        user: AuthenticatedUser,
        warehouseId: string,
        input: CreateInventoryItemInput,
    ): Promise<InventoryItemResponse> {
        const warehouse = await prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                organizationId: user.organizationId,
            },
            select: { id: true },
        });

        if (!warehouse) {
            throw new NotFoundError("Warehouse not found.");
        }

        const product = await prisma.product.findFirst({
            where: {
                id: input.productId,
                organizationId: user.organizationId,
            },
            include: {
                variants: {
                    select: { id: true },
                },
            },
        });

        if (!product) {
            throw new NotFoundError("Product not found.");
        }

        let targetVariantId: string | null = null;
        if (product.variants.length > 0) {
            if (!input.variantId) {
                throw new BadRequestError(
                    "Product has variants. variantId is required.",
                );
            }
            const matchingVariant = product.variants.find(
                (v) => v.id === input.variantId,
            );
            if (!matchingVariant) {
                throw new BadRequestError(
                    "Invalid variantId for this product.",
                );
            }
            targetVariantId = matchingVariant.id;
        } else {
            if (input.variantId) {
                throw new BadRequestError(
                    "Product does not have variants. variantId must not be provided.",
                );
            }
            targetVariantId = null;
        }

        // Explicit check for PostgreSQL nullable composite uniqueness
        const existingItem = await prisma.inventoryItem.findFirst({
            where: {
                warehouseId,
                productId: product.id,
                variantId: targetVariantId,
            },
            select: { id: true },
        });

        if (existingItem) {
            throw new ConflictError(
                "Inventory item already exists in this warehouse for this product and variant. Use PATCH to update quantity.",
            );
        }

        const created = await prisma.inventoryItem.create({
            data: {
                warehouseId,
                productId: product.id,
                variantId: targetVariantId,
                availableQty: input.availableQty,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                    },
                },
                variant: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        attributes: true,
                    },
                },
            },
        });

        return mapInventoryItemToResponse(created);
    }

    // ==========================================
    // 8. Update Warehouse Inventory Quantity
    // ==========================================
    async updateWarehouseInventoryQty(
        user: AuthenticatedUser,
        warehouseId: string,
        inventoryId: string,
        input: UpdateInventoryItemQtyInput,
    ): Promise<InventoryItemResponse> {
        const warehouse = await prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                organizationId: user.organizationId,
            },
            select: { id: true },
        });

        if (!warehouse) {
            throw new NotFoundError("Warehouse not found.");
        }

        const existingItem = await prisma.inventoryItem.findFirst({
            where: {
                id: inventoryId,
                warehouseId,
            },
            select: { id: true },
        });

        if (!existingItem) {
            throw new NotFoundError("Inventory item not found in this warehouse.");
        }

        const updated = await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: {
                availableQty: input.availableQty,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                    },
                },
                variant: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        attributes: true,
                    },
                },
            },
        });

        return mapInventoryItemToResponse(updated);
    }
}

export const warehouseService = new WarehouseService();
