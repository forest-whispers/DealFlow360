import {
    FulfillmentLineStatus,
    FulfillmentStatus,
} from "./fulfillment.constants";

export interface OrderedWarehouse {
    id: string;
    name: string;
    code: string;
    priority: number;
    createdAt: Date | string;
}

export interface InventoryPoolItem {
    warehouseId: string;
    productId: string;
    variantId: string | null;
    availableQty: number;
}

export interface FulfillmentLineInput {
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    requiredQty: number;
}

export interface CalculatedAllocation {
    warehouseId: string;
    quantity: number;
}

export interface CalculatedFulfillmentLine {
    quotationLineNumber: number;
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    requiredQty: number;
    allocatedQty: number;
    status: FulfillmentLineStatus;
    allocations: CalculatedAllocation[];
}

export interface CalculatedFulfillment {
    status: FulfillmentStatus;
    totalRequiredQty: number;
    totalAllocatedQty: number;
    lines: CalculatedFulfillmentLine[];
}

function buildInventoryKey(
    warehouseId: string,
    productId: string,
    variantId: string | null,
): string {
    return `${warehouseId}:${productId}:${variantId ?? "null"}`;
}

/**
 * Pure, deterministic warehouse allocation engine.
 *
 * Requirements satisfied:
 * - Deterministic allocation across active warehouses ordered by priority ASC, createdAt ASC, id ASC.
 * - Shared inventory pool across lines within the same fulfillment to prevent double-allocating stock.
 * - Exact product/variant separation (variant lines match only identical variantId; non-variant lines match only variantId = null).
 * - Partial and pending allocation status derivations.
 * - Zero side effects (no database queries or entity mutations).
 */
export function calculateFulfillmentAllocations(
    lines: FulfillmentLineInput[],
    activeWarehouses: OrderedWarehouse[],
    inventoryItems: InventoryPoolItem[],
): CalculatedFulfillment {
    // 1. Build local tracked inventory pool
    const pool = new Map<string, number>();
    for (const item of inventoryItems) {
        const key = buildInventoryKey(
            item.warehouseId,
            item.productId,
            item.variantId,
        );
        pool.set(key, Math.max(0, item.availableQty));
    }

    // 2. Order lines deterministically by quotationLineNumber ASC
    const sortedLines = [...lines].sort(
        (a, b) => a.quotationLineNumber - b.quotationLineNumber,
    );

    const calculatedLines: CalculatedFulfillmentLine[] = [];
    let totalRequiredQty = 0;
    let totalAllocatedQty = 0;

    // 3. Process each line sequentially against the shared inventory pool
    for (const line of sortedLines) {
        totalRequiredQty += line.requiredQty;
        let remainingNeeded = line.requiredQty;
        const lineAllocations: CalculatedAllocation[] = [];

        if (remainingNeeded > 0) {
            for (const warehouse of activeWarehouses) {
                const key = buildInventoryKey(
                    warehouse.id,
                    line.productId,
                    line.variantId,
                );
                const currentAvailable = pool.get(key) ?? 0;

                if (currentAvailable > 0) {
                    const alloc = Math.min(currentAvailable, remainingNeeded);
                    if (alloc > 0) {
                        lineAllocations.push({
                            warehouseId: warehouse.id,
                            quantity: alloc,
                        });
                        remainingNeeded -= alloc;
                        pool.set(key, currentAvailable - alloc);
                    }
                }

                if (remainingNeeded === 0) {
                    break;
                }
            }
        }

        const allocatedQty = line.requiredQty - remainingNeeded;
        totalAllocatedQty += allocatedQty;

        let lineStatus: FulfillmentLineStatus;
        if (allocatedQty === line.requiredQty && line.requiredQty > 0) {
            lineStatus = FulfillmentLineStatus.ALLOCATED;
        } else if (allocatedQty > 0) {
            lineStatus = FulfillmentLineStatus.PARTIALLY_ALLOCATED;
        } else {
            lineStatus = FulfillmentLineStatus.PENDING;
        }

        calculatedLines.push({
            quotationLineNumber: line.quotationLineNumber,
            productId: line.productId,
            variantId: line.variantId,
            name: line.name,
            sku: line.sku,
            requiredQty: line.requiredQty,
            allocatedQty,
            status: lineStatus,
            allocations: lineAllocations,
        });
    }

    // 4. Derive overall fulfillment status
    let fulfillmentStatus: FulfillmentStatus;
    if (calculatedLines.length === 0) {
        fulfillmentStatus = FulfillmentStatus.PENDING;
    } else if (
        calculatedLines.every(
            (l) => l.status === FulfillmentLineStatus.ALLOCATED,
        )
    ) {
        fulfillmentStatus = FulfillmentStatus.ALLOCATED;
    } else if (
        calculatedLines.every((l) => l.status === FulfillmentLineStatus.PENDING)
    ) {
        fulfillmentStatus = FulfillmentStatus.PENDING;
    } else {
        fulfillmentStatus = FulfillmentStatus.PARTIALLY_ALLOCATED;
    }

    return {
        status: fulfillmentStatus,
        totalRequiredQty,
        totalAllocatedQty,
        lines: calculatedLines,
    };
}
