import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

const ALLOWED_ROLES = [
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
    UserRole.ADMIN,
] as const;

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...ALLOWED_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);

        const result = await negotiationService.getNegotiationHistory(user, id);
        return ok(result);
    },
);
