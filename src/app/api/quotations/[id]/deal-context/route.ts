import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { DEAL_INTELLIGENCE_ROLES } from "@/server/modules/deal-intelligence/deal-intelligence.constants";
import { dealIntelligenceService } from "@/server/modules/deal-intelligence/deal-intelligence.service";
import { quotationIdParamSchema } from "@/server/modules/deal-intelligence/deal-intelligence.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...DEAL_INTELLIGENCE_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const result = await dealIntelligenceService.getDealContext(user, id);

        return ok(result);
    },
);
