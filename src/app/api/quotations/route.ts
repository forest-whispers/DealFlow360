import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import {
    QUOTATION_CREATE_ROLES,
    QUOTATION_READ_ROLES,
} from "@/server/modules/quotations/quotation.constants";
import { quotationService } from "@/server/modules/quotations/quotation.service";
import {
    createQuotationSchema,
    listQuotationsSchema,
} from "@/server/modules/quotations/quotation.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...QUOTATION_READ_ROLES);
    const rawQuery = getQuery(request);
    const query = listQuotationsSchema.parse(rawQuery);
    const result = await quotationService.listQuotations(user, query);

    return ok(result);
});

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...QUOTATION_CREATE_ROLES);
    const dto = await parseBody(request, createQuotationSchema);
    const quotation = await quotationService.createQuotation(user, dto);

    return created(quotation);
});
