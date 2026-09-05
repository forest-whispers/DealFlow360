import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { warehouseService } from "@/server/modules/warehouses/warehouse.service";
import {
    createInventoryItemSchema,
    listInventorySchema,
    warehouseIdParamSchema,
} from "@/server/modules/warehouses/warehouse.validation";
import {
    INVENTORY_MANAGE_ROLES,
    INVENTORY_READ_ROLES,
} from "@/server/modules/warehouses/warehouse.constants";

export const GET = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...INVENTORY_READ_ROLES);
        const rawParams = await context.params;
        const { id } = warehouseIdParamSchema.parse(rawParams);
        const rawQuery = getQuery(request);
        const query = listInventorySchema.parse(rawQuery);

        const result = await warehouseService.listWarehouseInventory(
            user,
            id,
            query,
        );
        return ok(result);
    },
);

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...INVENTORY_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = warehouseIdParamSchema.parse(rawParams);
        const body = await parseBody(request, createInventoryItemSchema);

        const item = await warehouseService.createWarehouseInventory(
            user,
            id,
            body,
        );
        return created(item);
    },
);
