import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { DEAL_INTELLIGENCE_ROLES } from "@/server/modules/deal-intelligence/deal-intelligence.constants";
import { quotationIdParamSchema } from "@/server/modules/deal-intelligence/deal-intelligence.validation";
import { riskExplanationService } from "@/server/modules/ai/risk-explanation/risk-explanation.service";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...DEAL_INTELLIGENCE_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);

        const mockMode =
            process.env.NODE_ENV !== "production"
                ? request.headers.get("x-mock-ai-mode") ?? undefined
                : undefined;

        const result = await riskExplanationService.getRiskExplanation(user, id, {
            mockMode,
        });

        return ok(result);
    }
);
