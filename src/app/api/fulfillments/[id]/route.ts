import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { fulfillmentService } from "@/server/modules/fulfillment/fulfillment.service";
import { fulfillmentIdParamSchema } from "@/server/modules/fulfillment/fulfillment.validation";
import { FULFILLMENT_READ_ROLES } from "@/server/modules/fulfillment/fulfillment.constants";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...FULFILLMENT_READ_ROLES);
        const rawParams = await context.params;
        const { id } = fulfillmentIdParamSchema.parse(rawParams);

        const fulfillment = await fulfillmentService.getFulfillmentById(user, id);
        return ok(fulfillment);
    },
);
