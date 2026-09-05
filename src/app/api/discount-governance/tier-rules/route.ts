import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_CONFIG_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import {
    createTierRuleSchema,
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
    const tierRules = await discountGovernanceService.listTierRules(
        user,
        query,
    );

    return ok({
        tierRules,
    });
});

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
    const dto = await parseBody(request, createTierRuleSchema);
    const tierRule = await discountGovernanceService.createTierRule(user, dto);

    return created({
        tierRule,
    });
});
