import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import {
    createChangeRequestSchema,
    portalQuotationParamSchema,
} from "@/server/modules/negotiation/negotiation.validation";

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(UserRole.CUSTOMER);
        const rawParams = await context.params;
        const { id } = portalQuotationParamSchema.parse(rawParams);
        const dto = await parseBody(request, createChangeRequestSchema);

        const result = await negotiationService.requestCommercialChange(
            user,
            id,
            dto,
        );
        return ok(result);
    },
);
