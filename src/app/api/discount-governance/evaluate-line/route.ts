import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_EVALUATE_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import { evaluateLineSchema } from "@/server/modules/discount-governance/discount-governance.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_EVALUATE_ROLES);
    const dto = await parseBody(request, evaluateLineSchema);
    const evaluation = await discountGovernanceService.evaluateLine(user, dto);

    return ok({
        ...evaluation,
        evaluation,
    });
});
