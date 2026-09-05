import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { warehouseService } from "@/server/modules/warehouses/warehouse.service";
import {
    updateWarehouseSchema,
    warehouseIdParamSchema,
} from "@/server/modules/warehouses/warehouse.validation";
import {
    WAREHOUSE_MANAGE_ROLES,
    WAREHOUSE_READ_ROLES,
} from "@/server/modules/warehouses/warehouse.constants";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...WAREHOUSE_READ_ROLES);
        const rawParams = await context.params;
        const { id } = warehouseIdParamSchema.parse(rawParams);

        const warehouse = await warehouseService.getWarehouseById(user, id);
        return ok(warehouse);
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...WAREHOUSE_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = warehouseIdParamSchema.parse(rawParams);
        const body = await parseBody(request, updateWarehouseSchema);

        const updated = await warehouseService.updateWarehouse(user, id, body);
        return ok(updated);
    },
);
