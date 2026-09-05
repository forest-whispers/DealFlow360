import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { customerService } from "@/server/modules/customers/customer.service";
import {
    customerIdParamSchema,
    updateCustomerSchema,
} from "@/server/modules/customers/customer.validation";
import {
    CUSTOMER_READ_ROLES,
    CUSTOMER_STATUS_ROLES,
    CUSTOMER_UPDATE_ROLES,
} from "@/server/modules/customers/customer.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...CUSTOMER_READ_ROLES);
        const rawParams = await context.params;
        const { id } = customerIdParamSchema.parse(rawParams);
        const customer = await customerService.getCustomerById(user, id);

        return ok({
            customer,
        });
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...CUSTOMER_UPDATE_ROLES);
        const rawParams = await context.params;
        const { id } = customerIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateCustomerSchema);
        const customer = await customerService.updateCustomer(user, id, dto);

        return ok({
            customer,
        });
    },
);

export const DELETE = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...CUSTOMER_STATUS_ROLES);
        const rawParams = await context.params;
        const { id } = customerIdParamSchema.parse(rawParams);
        const result = await customerService.archiveCustomer(user, id);

        return ok(result);
    },
);
