import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_CONFIG_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import {
    createCategoryRuleSchema,
    listRulesQuerySchema,
} from "@/server/modules/discount-governance/discount-governance.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
    const rawQuery = getQuery(request);
    const query = listRulesQuerySchema.parse(rawQuery);
    const categoryRules =
        await discountGovernanceService.listCategoryRules(user, query);

    return ok({
        categoryRules,
    });
});

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
    const dto = await parseBody(request, createCategoryRuleSchema);
    const categoryRule =
        await discountGovernanceService.createCategoryRule(user, dto);

    return created({
        categoryRule,
    });
});
