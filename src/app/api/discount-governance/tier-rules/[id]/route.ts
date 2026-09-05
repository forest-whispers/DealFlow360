import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_CONFIG_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import {
    ruleIdParamSchema,
    updateTierRuleSchema,
} from "@/server/modules/discount-governance/discount-governance.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const tierRule = await discountGovernanceService.getTierRuleById(
            user,
            id,
        );

        return ok({
            tierRule,
        });
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateTierRuleSchema);
        const tierRule = await discountGovernanceService.updateTierRule(
            user,
            id,
            dto,
        );

        return ok({
            tierRule,
        });
    },
);

export const DELETE = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const result = await discountGovernanceService.archiveTierRule(
            user,
            id,
        );

        return ok(result);
    },
);
