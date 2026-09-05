import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { billingService } from "@/server/modules/billing/billing.service";
import { subscriptionIdParamSchema } from "@/server/modules/billing/billing.validation";
import { SUBSCRIPTION_READ_ROLES } from "@/server/modules/billing/billing.constants";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...SUBSCRIPTION_READ_ROLES);
        const rawParams = await context.params;
        const { id } = subscriptionIdParamSchema.parse(rawParams);

        const subscription = await billingService.getSubscriptionById(user, id);
        return ok(subscription);
    },
);
