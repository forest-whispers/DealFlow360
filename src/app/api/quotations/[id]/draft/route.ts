import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { QUOTATION_MANAGE_ROLES } from "@/server/modules/quotations/quotation.constants";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import {
    quotationIdParamSchema,
    saveDraftSchema,
} from "@/server/modules/quotations/quotation.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const PUT = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...QUOTATION_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, saveDraftSchema);
        const quotation = await quotationService.saveDraft(user, id, dto);

        return ok(quotation);
    },
);
