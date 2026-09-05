import {
    Fulfillment,
    FulfillmentLine,
    FulfillmentLineStatus,
    FulfillmentStatus,
    Prisma,
    QuotationRevisionStatus,
    QuotationStatus,
    Warehouse,
    WarehouseAllocation,
    WarehouseStatus,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { FULFILLMENT_PAGINATION } from "./fulfillment.constants";
import {
    calculateFulfillmentAllocations,
    FulfillmentLineInput,
} from "./fulfillment.calculation";
import type {
    CanonicalFulfillmentResponse,
    CreateFulfillmentInput,
    FulfillmentLineAllocationResponse,
    FulfillmentLineResponse,
    FulfillmentListResponse,
    FulfillmentSummaryResponse,
    ListFulfillmentsQuery,
} from "./fulfillment.types";

type FulfillmentLineWithAllocations = FulfillmentLine & {
    allocations: (WarehouseAllocation & {
        warehouse: Pick<Warehouse, "id" | "name" | "code" | "priority">;
    })[];
};

type FullFulfillment = Fulfillment & {
    quotation: { quoteNumber: string };
    revision: { revisionNumber: number };
    lines: FulfillmentLineWithAllocations[];
};

export class FulfillmentService {
    // ==========================================
    // Internal Helper: Format Canonical Response
    // ==========================================
    private formatCanonicalResponse(
        record: FullFulfillment,
    ): CanonicalFulfillmentResponse {
        let totalRequired = 0;
        let totalAllocated = 0;

        const lines: FulfillmentLineResponse[] = record.lines.map((line) => {
            totalRequired += line.requiredQty;
            totalAllocated += line.allocatedQty;

            const allocations: FulfillmentLineAllocationResponse[] =
                line.allocations.map((alloc) => ({
                    id: alloc.id,
                    warehouseId: alloc.warehouseId,
                    warehouse: {
                        id: alloc.warehouse.id,
                        name: alloc.warehouse.name,
                        code: alloc.warehouse.code,
                        priority: alloc.warehouse.priority,
                    },
                    quantity: alloc.quantity,
                    createdAt: alloc.createdAt.toISOString(),
                }));

            return {
                id: line.id,
                quotationLineNumber: line.quotationLineNumber,
                productId: line.productId,
                variantId: line.variantId,
                name: line.name,
                sku: line.sku,
                requiredQty: line.requiredQty,
                allocatedQty: line.allocatedQty,
                status: line.status,
                allocations,
            };
        });

        return {
            id: record.id,
            fulfillmentNumber: record.fulfillmentNumber,
            quotationId: record.quotationId,
            quotationNumber: record.quotation.quoteNumber,
            revisionId: record.revisionId,
            revisionNumber: record.revision.revisionNumber,
            status: record.status,
            totalRequiredQty: totalRequired,
            totalAllocatedQty: totalAllocated,
            lines,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        };
    }

    // ==========================================
    // 1. Create Fulfillment
    // ==========================================
    async createFulfillment(
        user: AuthenticatedUser,
        input: CreateFulfillmentInput,
    ): Promise<CanonicalFulfillmentResponse> {
        return await prisma.$transaction(async (tx) => {
            // Concurrency lock 1: Lock Organization row to serialize sequence numbering
            await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${user.organizationId} FOR UPDATE`;

            // Concurrency lock 2: Lock Quotation row to serialize duplicate fulfillment attempts
            const quotationRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
                SELECT id, status FROM "Quotation" 
                WHERE id = ${input.quotationId} AND "organizationId" = ${user.organizationId} 
                FOR UPDATE
            `;

            if (quotationRows.length === 0) {
                throw new NotFoundError("Quotation not found.");
            }

            // Fetch authoritative quotation and latest revision
            const quotation = await tx.quotation.findFirst({
                where: {
                    id: input.quotationId,
                    organizationId: user.organizationId,
                },
                include: {
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        include: {
                            lines: {
                                orderBy: { lineNumber: "asc" },
                            },
                        },
                    },
                    fulfillments: {
                        select: { id: true },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError("Quotation not found.");
            }

            // Duplicate prevention (race-safe under FOR UPDATE lock)
            if (quotation.fulfillments.length > 0) {
                throw new ConflictError(
                    "A fulfillment already exists for this quotation.",
                );
            }

            // Status checks
            if (quotation.status !== QuotationStatus.CONFIRMED) {
                throw new BadRequestError(
                    `Only CONFIRMED quotations can be fulfilled. Current status is ${quotation.status}.`,
                );
            }

            const latestRevision = quotation.revisions[0];
            if (!latestRevision) {
                throw new BadRequestError("Quotation revision not found.");
            }

            if (latestRevision.status !== QuotationRevisionStatus.CONFIRMED) {
                throw new BadRequestError(
                    `Latest quotation revision is not CONFIRMED. Current revision status is ${latestRevision.status}.`,
                );
            }

            if (latestRevision.lines.length === 0) {
                throw new BadRequestError("Quotation has no lines to fulfill.");
            }

            // Fetch active warehouses with explicit deterministic ordering
            const activeWarehouses = await tx.warehouse.findMany({
                where: {
                    organizationId: user.organizationId,
                    status: WarehouseStatus.ACTIVE,
                },
                orderBy: [
                    { priority: "asc" },
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
                select: {
                    id: true,
                    name: true,
                    code: true,
                    priority: true,
                    createdAt: true,
                },
            });

            // Fetch candidate inventory for the needed products in active warehouses
            const neededProductIds = [
                ...new Set(latestRevision.lines.map((l) => l.productId)),
            ];
            const activeWarehouseIds = activeWarehouses.map((w) => w.id);

            const inventoryItems =
                activeWarehouseIds.length > 0 && neededProductIds.length > 0
                    ? await tx.inventoryItem.findMany({
                          where: {
                              warehouseId: { in: activeWarehouseIds },
                              productId: { in: neededProductIds },
                          },
                          select: {
                              warehouseId: true,
                              productId: true,
                              variantId: true,
                              availableQty: true,
                          },
                      })
                    : [];

            // Snapshot authoritative operational fields from the confirmed revision
            const linesToAllocate: FulfillmentLineInput[] =
                latestRevision.lines.map((line) => ({
                    quotationLineNumber: line.lineNumber,
                    productId: line.productId,
                    variantId: line.variantId,
                    name: line.name,
                    sku: line.sku,
                    requiredQty: line.quantity,
                }));

            // Execute deterministic allocation engine
            const calculation = calculateFulfillmentAllocations(
                linesToAllocate,
                activeWarehouses,
                inventoryItems,
            );

            // Generate organization-scoped fulfillment number race-safely
            const currentYear = new Date().getFullYear();
            const prefix = `FUL-${currentYear}-`;

            const lastFulfillment = await tx.fulfillment.findFirst({
                where: {
                    organizationId: user.organizationId,
                    fulfillmentNumber: { startsWith: prefix },
                },
                orderBy: { fulfillmentNumber: "desc" },
                select: { fulfillmentNumber: true },
            });

            let nextSeq = 1;
            if (lastFulfillment) {
                const parts = lastFulfillment.fulfillmentNumber.split("-");
                const num = parseInt(parts[2], 10);
                if (!isNaN(num)) {
                    nextSeq = num + 1;
                }
            }

            const fulfillmentNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

            // Create Fulfillment record
            const createdFulfillment = await tx.fulfillment.create({
                data: {
                    fulfillmentNumber,
                    quotationId: quotation.id,
                    revisionId: latestRevision.id,
                    status: calculation.status,
                    organizationId: user.organizationId,
                },
            });

            // Create FulfillmentLine and WarehouseAllocation records
            for (const calcLine of calculation.lines) {
                const createdLine = await tx.fulfillmentLine.create({
                    data: {
                        fulfillmentId: createdFulfillment.id,
                        quotationLineNumber: calcLine.quotationLineNumber,
                        productId: calcLine.productId,
                        variantId: calcLine.variantId,
                        name: calcLine.name,
                        sku: calcLine.sku,
                        requiredQty: calcLine.requiredQty,
                        allocatedQty: calcLine.allocatedQty,
                        status: calcLine.status,
                    },
                });

                if (calcLine.allocations.length > 0) {
                    await tx.warehouseAllocation.createMany({
                        data: calcLine.allocations.map((alloc) => ({
                            fulfillmentLineId: createdLine.id,
                            warehouseId: alloc.warehouseId,
                            quantity: alloc.quantity,
                        })),
                    });
                }
            }

            // Return full canonical response
            const fullRecord = await tx.fulfillment.findUniqueOrThrow({
                where: { id: createdFulfillment.id },
                include: {
                    quotation: { select: { quoteNumber: true } },
                    revision: { select: { revisionNumber: true } },
                    lines: {
                        orderBy: { quotationLineNumber: "asc" },
                        include: {
                            allocations: {
                                include: {
                                    warehouse: {
                                        select: {
                                            id: true,
                                            name: true,
                                            code: true,
                                            priority: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            return this.formatCanonicalResponse(fullRecord);
        });
    }

    // ==========================================
    // 2. Get Fulfillment By ID
    // ==========================================
    async getFulfillmentById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<CanonicalFulfillmentResponse> {
        const record = await prisma.fulfillment.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
            include: {
                quotation: { select: { quoteNumber: true } },
                revision: { select: { revisionNumber: true } },
                lines: {
                    orderBy: { quotationLineNumber: "asc" },
                    include: {
                        allocations: {
                            include: {
                                warehouse: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                        priority: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!record) {
            throw new NotFoundError("Fulfillment not found.");
        }

        return this.formatCanonicalResponse(record);
    }

    // ==========================================
    // 3. List Fulfillments
    // ==========================================
    async listFulfillments(
        user: AuthenticatedUser,
        query: ListFulfillmentsQuery,
    ): Promise<FulfillmentListResponse> {
        const page = query.page ?? FULFILLMENT_PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? FULFILLMENT_PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.FulfillmentWhereInput = {
            organizationId: user.organizationId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.quotationId) {
            where.quotationId = query.quotationId.trim();
        }

        const [total, records] = await prisma.$transaction([
            prisma.fulfillment.count({ where }),
            prisma.fulfillment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    quotation: { select: { quoteNumber: true } },
                    revision: { select: { revisionNumber: true } },
                    lines: {
                        select: {
                            requiredQty: true,
                            allocatedQty: true,
                        },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        const fulfillments: FulfillmentSummaryResponse[] = records.map(
            (record) => {
                let totalRequired = 0;
                let totalAllocated = 0;
                for (const line of record.lines) {
                    totalRequired += line.requiredQty;
                    totalAllocated += line.allocatedQty;
                }

                return {
                    id: record.id,
                    fulfillmentNumber: record.fulfillmentNumber,
                    quotationId: record.quotationId,
                    quotationNumber: record.quotation.quoteNumber,
                    revisionId: record.revisionId,
                    revisionNumber: record.revision.revisionNumber,
                    status: record.status,
                    totalRequiredQty: totalRequired,
                    totalAllocatedQty: totalAllocated,
                    lineCount: record.lines.length,
                    createdAt: record.createdAt.toISOString(),
                    updatedAt: record.updatedAt.toISOString(),
                };
            },
        );

        return {
            fulfillments,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
}

export const fulfillmentService = new FulfillmentService();
