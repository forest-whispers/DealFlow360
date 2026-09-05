import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { getQuery } from "@/server/shared/http/query";
import { billingService } from "@/server/modules/billing/billing.service";
import { listInvoicesSchema } from "@/server/modules/billing/billing.validation";
import { INVOICE_READ_ROLES } from "@/server/modules/billing/billing.constants";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...INVOICE_READ_ROLES);
    const rawQuery = getQuery(request);
    const query = listInvoicesSchema.parse(rawQuery);
    const result = await billingService.listInvoices(user, query);

    return ok(result);
});
