import { WarehouseStatus } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    warehouseService,
    mapWarehouseToResponse,
} from "@/server/modules/warehouses/warehouse.service";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type { DemoWarehouses } from "./types";

export async function seedWarehouses(
    adminUser: AuthenticatedUser,
): Promise<DemoWarehouses> {
    console.log("--> Stage 4: Provisioning Strategic Warehouses & Priority Hierarchy...");

    async function resolveWarehouse(name: string, code: string, priority: number) {
        const existing = await prisma.warehouse.findFirst({
            where: {
                organizationId: adminUser.organizationId,
                code,
            },
            include: {
                _count: { select: { inventory: true } },
            },
        });

        if (existing) {
            if (existing.priority !== priority || existing.status !== WarehouseStatus.ACTIVE) {
                const updated = await prisma.warehouse.update({
                    where: { id: existing.id },
                    data: { priority, status: WarehouseStatus.ACTIVE },
                    include: {
                        _count: { select: { inventory: true } },
                    },
                });
                return mapWarehouseToResponse(updated);
            }
            return mapWarehouseToResponse(existing);
        }

        return await warehouseService.createWarehouse(adminUser, {
            name,
            code,
            priority,
            status: WarehouseStatus.ACTIVE,
        });
    }

    const north = await resolveWarehouse(
        "Northern Logistics Center",
        "WH-NORTH",
        1,
    );

    const south = await resolveWarehouse(
        "Southern Regional Hub",
        "WH-SOUTH",
        2,
    );

    const east = await resolveWarehouse(
        "Eastern Distribution Depot",
        "WH-EAST",
        3,
    );

    console.log(`    ✓ Warehouse Priority 1: ${north.name} (${north.code})`);
    console.log(`    ✓ Warehouse Priority 2: ${south.name} (${south.code})`);
    console.log(`    ✓ Warehouse Priority 3: ${east.name} (${east.code})`);

    return {
        north,
        south,
        east,
    };
}
