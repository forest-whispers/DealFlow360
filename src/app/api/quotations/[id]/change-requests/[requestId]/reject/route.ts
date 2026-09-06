import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";

const ALLOWED_ROLES = [
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
    UserRole.ADMIN,
] as const;

const rejectParamsSchema = quotationIdParamSchema.extend({
    requestId: z.string().min(1, "Change request ID is required"),
});

const rejectBodySchema = z.object({
    reason: z.string().trim().max(1000).optional(),
});

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...ALLOWED_ROLES);
        const rawParams = await context.params;
        const { id, requestId } = rejectParamsSchema.parse(rawParams);
        const body = await parseBody(request, rejectBodySchema);

        const result = await negotiationService.declineChangeRequest(
            user,
            id,
            requestId,
            body?.reason,
        );

        return ok(result);
    },
);
