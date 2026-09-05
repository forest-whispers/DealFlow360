import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { QUOTATION_MANAGE_ROLES } from "@/server/modules/quotations/quotation.constants";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import {
    quotationLineParamSchema,
    recalculateLineSchema,
} from "@/server/modules/quotations/quotation.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...QUOTATION_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id, lineNumber } = quotationLineParamSchema.parse(rawParams);
        const dto = await parseBody(request, recalculateLineSchema);
        const result = await quotationService.recalculateLine(
            user,
            id,
            lineNumber,
            dto,
        );

        return ok(result);
    },
);
