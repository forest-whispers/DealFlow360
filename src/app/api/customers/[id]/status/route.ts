import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { customerService } from "@/server/modules/customers/customer.service";
import {
    customerIdParamSchema,
    updateCustomerStatusSchema,
} from "@/server/modules/customers/customer.validation";
import { CUSTOMER_STATUS_ROLES } from "@/server/modules/customers/customer.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...CUSTOMER_STATUS_ROLES);
        const rawParams = await context.params;
        const { id } = customerIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateCustomerStatusSchema);
        const result = await customerService.updateCustomerStatus(
            user,
            id,
            dto.isActive,
        );

        return ok(result);
    },
);
