import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { GOVERNANCE_CONFIG_ROLES } from "@/server/modules/discount-governance/discount-governance.constants";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";
import { updateApprovalPolicySchema } from "@/server/modules/discount-governance/discount-governance.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(async (_request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
    const approvalPolicy =
        await discountGovernanceService.getApprovalPolicy(user);

    return ok({
        approvalPolicy,
    });
});

export const PATCH = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(...GOVERNANCE_CONFIG_ROLES);
    const dto = await parseBody(request, updateApprovalPolicySchema);
    const approvalPolicy =
        await discountGovernanceService.updateApprovalPolicy(user, dto);

    return ok({
        approvalPolicy,
    });
});
