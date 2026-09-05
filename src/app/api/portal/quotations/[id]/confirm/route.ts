import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { portalQuotationParamSchema } from "@/server/modules/negotiation/negotiation.validation";

export const POST = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(UserRole.CUSTOMER);
        const rawParams = await context.params;
        const { id } = portalQuotationParamSchema.parse(rawParams);

        const result = await negotiationService.confirmQuotation(user, id);
        return ok(result);
    },
);
