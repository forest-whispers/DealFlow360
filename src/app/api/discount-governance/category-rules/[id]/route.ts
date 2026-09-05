import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_CONFIG_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import {
    ruleIdParamSchema,
    updateCategoryRuleSchema,
} from "@/server/modules/discount-governance/discount-governance.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const categoryRule =
            await discountGovernanceService.getCategoryRuleById(user, id);

        return ok({
            categoryRule,
        });
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateCategoryRuleSchema);
        const categoryRule =
            await discountGovernanceService.updateCategoryRule(user, id, dto);

        return ok({
            categoryRule,
        });
    },
);

export const DELETE = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
        const rawParams = await context.params;
        const { id } = ruleIdParamSchema.parse(rawParams);
        const result = await discountGovernanceService.archiveCategoryRule(
            user,
            id,
        );

        return ok(result);
    },
);
