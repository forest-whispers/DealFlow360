import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { warehouseService } from "@/server/modules/warehouses/warehouse.service";
import {
    inventoryIdParamSchema,
    updateInventoryItemQtySchema,
} from "@/server/modules/warehouses/warehouse.validation";
import { INVENTORY_MANAGE_ROLES } from "@/server/modules/warehouses/warehouse.constants";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...INVENTORY_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id, inventoryId } = inventoryIdParamSchema.parse(rawParams);
        const body = await parseBody(request, updateInventoryItemQtySchema);

        const updated = await warehouseService.updateWarehouseInventoryQty(
            user,
            id,
            inventoryId,
            body,
        );
        return ok(updated);
    },
);
