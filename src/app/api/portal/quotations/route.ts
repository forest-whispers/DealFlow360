import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { negotiationService } from "@/server/modules/negotiation/negotiation.service";
import { portalQuotationListSchema } from "@/server/modules/negotiation/negotiation.validation";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(UserRole.CUSTOMER);
    const searchParams = request.nextUrl.searchParams;
    const query = portalQuotationListSchema.parse({
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    });

    const result = await negotiationService.listCustomerQuotations(user, query);
    return ok(result);
});
