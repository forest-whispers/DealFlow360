import { prisma } from "@/server/shared/db/prisma";
import type { DemoProducts, DemoWarehouses } from "./types";

export async function seedInventory(
    products: DemoProducts,
    warehouses: DemoWarehouses,
): Promise<void> {
    console.log("--> Stage 5: Configuring Targeted Stock Levels & Multi-Warehouse Allocation Pool...");

    async function setStock(
        warehouseId: string,
        productId: string,
        variantId: string | null,
        availableQty: number,
    ) {
        // Enforce deterministic inventory level
        const existing = await prisma.inventoryItem.findFirst({
            where: {
                warehouseId,
                productId,
                variantId,
            },
        });

        if (existing) {
            await prisma.inventoryItem.update({
                where: { id: existing.id },
                data: { availableQty },
            });
        } else {
            await prisma.inventoryItem.create({
                data: {
                    warehouseId,
                    productId,
                    variantId,
                    availableQty,
                },
            });
        }
    }

    // 1. Scenario: Server Pro 16C (SRV-16C-64G) Multi-Warehouse Split
    // Target: A confirmed quotation for 10 units will allocate 6 from WH-NORTH (Priority 1 cap)
    // and 4 from WH-SOUTH (Priority 2 overflow), verifying pure backend allocation split.
    await setStock(warehouses.north.id, products.serverPro.id, products.serverVariant16C.id, 6);
    await setStock(warehouses.south.id, products.serverPro.id, products.serverVariant16C.id, 10);
    await setStock(warehouses.east.id, products.serverPro.id, products.serverVariant16C.id, 15);

    // 2. Scenario: Server Pro 32C (SRV-32C-128G) Stable Operational Baseline
    await setStock(warehouses.north.id, products.serverPro.id, products.serverVariant32C.id, 8);
    await setStock(warehouses.south.id, products.serverPro.id, products.serverVariant32C.id, 8);
    await setStock(warehouses.east.id, products.serverPro.id, products.serverVariant32C.id, 8);

    // 3. Scenario: Industrial Managed Switch 24P (Direct Non-Variant Hardware) Shortage Pool
    // Target: Total available across all facilities is only 3 units (0 in North, 2 in South, 1 in East).
    // A confirmed quotation for 5 units will result in PARTIALLY_ALLOCATED (3 allocated, 2 short).
    await setStock(warehouses.north.id, products.switch24P.id, null, 0);
    await setStock(warehouses.south.id, products.switch24P.id, null, 2);
    await setStock(warehouses.east.id, products.switch24P.id, null, 1);

    console.log("    ✓ Configured SRV-16C-64G Stock: WH-NORTH=6 (Pri 1), WH-SOUTH=10 (Pri 2), WH-EAST=15 (Pri 3)");
    console.log("    ✓ Configured SRV-32C-128G Stock: WH-NORTH=8, WH-SOUTH=8, WH-EAST=8");
    console.log("    ✓ Configured Switch 24P Shortage Stock: WH-NORTH=0, WH-SOUTH=2, WH-EAST=1 (Total=3 across fleet)");
}
