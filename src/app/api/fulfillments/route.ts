import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { fulfillmentService } from "@/server/modules/fulfillment/fulfillment.service";
import {
    createFulfillmentSchema,
    listFulfillmentsSchema,
} from "@/server/modules/fulfillment/fulfillment.validation";
import {
    FULFILLMENT_CREATE_ROLES,
    FULFILLMENT_READ_ROLES,
} from "@/server/modules/fulfillment/fulfillment.constants";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...FULFILLMENT_READ_ROLES);
    const rawQuery = getQuery(request);
    const query = listFulfillmentsSchema.parse(rawQuery);
    const result = await fulfillmentService.listFulfillments(user, query);

    return ok(result);
});

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...FULFILLMENT_CREATE_ROLES);
    const body = await parseBody(request, createFulfillmentSchema);
    const fulfillment = await fulfillmentService.createFulfillment(user, body);

    return created(fulfillment);
});
