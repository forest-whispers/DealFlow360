import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { warehouseService } from "@/server/modules/warehouses/warehouse.service";
import {
    createWarehouseSchema,
    listWarehousesSchema,
} from "@/server/modules/warehouses/warehouse.validation";
import {
    WAREHOUSE_MANAGE_ROLES,
    WAREHOUSE_READ_ROLES,
} from "@/server/modules/warehouses/warehouse.constants";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...WAREHOUSE_READ_ROLES);
    const rawQuery = getQuery(request);
    const query = listWarehousesSchema.parse(rawQuery);
    const result = await warehouseService.listWarehouses(user, query);

    return ok(result);
});

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...WAREHOUSE_MANAGE_ROLES);
    const body = await parseBody(request, createWarehouseSchema);
    const warehouse = await warehouseService.createWarehouse(user, body);

    return created(warehouse);
});
