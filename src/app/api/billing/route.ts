import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { created } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { billingService } from "@/server/modules/billing/billing.service";
import { generateBillingSchema } from "@/server/modules/billing/billing.validation";
import { BILLING_GENERATE_ROLES } from "@/server/modules/billing/billing.constants";

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...BILLING_GENERATE_ROLES);
    const body = await parseBody(request, generateBillingSchema);
    const result = await billingService.generateBilling(user, body);

    return created(result);
});
