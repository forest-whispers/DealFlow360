import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { customerService } from "@/server/modules/customers/customer.service";
import {
    createCustomerSchema,
    listCustomersSchema,
} from "@/server/modules/customers/customer.validation";
import {
    CUSTOMER_CREATE_ROLES,
    CUSTOMER_READ_ROLES,
} from "@/server/modules/customers/customer.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (request: NextRequest) => {
        const user = await requireRole(...CUSTOMER_READ_ROLES);
        const rawQuery = getQuery(request);
        const query = listCustomersSchema.parse(rawQuery);
        const result = await customerService.listCustomers(user, query);

        return ok(result);
    },
);

export const POST = createRouteHandler(
    async (request: NextRequest) => {
        const user = await requireRole(...CUSTOMER_CREATE_ROLES);
        const dto = await parseBody(request, createCustomerSchema);
        const customer = await customerService.createCustomer(user, dto);

        return created({
            customer,
        });
    },
);
