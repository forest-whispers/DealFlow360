import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { warehouseService } from "@/server/modules/warehouses/warehouse.service";
import {
    updateWarehouseStatusSchema,
    warehouseIdParamSchema,
} from "@/server/modules/warehouses/warehouse.validation";
import { WAREHOUSE_MANAGE_ROLES } from "@/server/modules/warehouses/warehouse.constants";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...WAREHOUSE_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = warehouseIdParamSchema.parse(rawParams);
        const body = await parseBody(request, updateWarehouseStatusSchema);

        const updated = await warehouseService.updateWarehouseStatus(
            user,
            id,
            body.status,
        );
        return ok(updated);
    },
);
