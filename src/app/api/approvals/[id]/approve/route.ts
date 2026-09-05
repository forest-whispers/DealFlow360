import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { BadRequestError } from "@/server/shared/errors/errors";
import { APPROVAL_ACTION_ROLES } from "@/server/modules/approvals/approval.constants";
import { approvalService } from "@/server/modules/approvals/approval.service";
import {
    approvalRequestIdParamSchema,
    approveStepSchema,
} from "@/server/modules/approvals/approval.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...APPROVAL_ACTION_ROLES);
        const rawParams = await context.params;
        const { id } = approvalRequestIdParamSchema.parse(rawParams);

        let body: unknown = {};
        try {
            const text = await request.text();
            if (text.trim().length > 0) {
                body = JSON.parse(text);
            }
        } catch {
            throw new BadRequestError("Invalid JSON request body.");
        }

        const dto = approveStepSchema.parse(body);
        const result = await approvalService.approveStep(user, id, dto);

        return ok(result);
    },
);
