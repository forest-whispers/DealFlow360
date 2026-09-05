import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { APPROVAL_ACTION_ROLES } from "@/server/modules/approvals/approval.constants";
import { approvalService } from "@/server/modules/approvals/approval.service";
import {
    approvalRequestIdParamSchema,
    rejectStepSchema,
} from "@/server/modules/approvals/approval.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...APPROVAL_ACTION_ROLES);
        const rawParams = await context.params;
        const { id } = approvalRequestIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, rejectStepSchema);
        const result = await approvalService.rejectStep(user, id, dto);

        return ok(result);
    },
);
