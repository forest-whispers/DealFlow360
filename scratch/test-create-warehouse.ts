import { prisma } from "../src/server/shared/db/prisma";
import { warehouseService } from "../src/server/modules/warehouses/warehouse.service";
import { UserRole, WarehouseStatus } from "@prisma/client";

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    if (!admin) throw new Error("No admin");

    const code = `WH-TEST-${Date.now().toString().slice(-4)}`;
    const created = await warehouseService.createWarehouse(admin as any, {
        name: "Test Automated Warehouse",
        code,
        priority: 3,
        status: WarehouseStatus.ACTIVE,
    });

    console.log("Successfully created warehouse:", created.id, created.name, created.code, created.priority);

    // Verify it lists
    const list = await warehouseService.listWarehouses(admin as any, {});
    const found = list.warehouses.find((w) => w.id === created.id);
    if (!found) throw new Error("Created warehouse not found in list");
    console.log("✓ Found newly created warehouse in list!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
