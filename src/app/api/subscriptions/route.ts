import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { getQuery } from "@/server/shared/http/query";
import { billingService } from "@/server/modules/billing/billing.service";
import { listSubscriptionsSchema } from "@/server/modules/billing/billing.validation";
import { SUBSCRIPTION_READ_ROLES } from "@/server/modules/billing/billing.constants";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...SUBSCRIPTION_READ_ROLES);
    const rawQuery = getQuery(request);
    const query = listSubscriptionsSchema.parse(rawQuery);
    const result = await billingService.listSubscriptions(user, query);

    return ok(result);
});
