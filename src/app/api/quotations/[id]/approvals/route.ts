import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { APPROVAL_READ_ROLES } from "@/server/modules/approvals/approval.constants";
import { approvalService } from "@/server/modules/approvals/approval.service";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...APPROVAL_READ_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const result = await approvalService.getQuotationApprovalHistory(
            user,
            id,
        );

        return ok(result);
    },
);
