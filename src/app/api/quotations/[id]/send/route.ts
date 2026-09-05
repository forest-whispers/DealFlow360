import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { QUOTATION_MANAGE_ROLES } from "@/server/modules/quotations/quotation.constants";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...QUOTATION_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const result = await quotationService.sendQuotation(user, id);

        return ok(result);
    },
);
