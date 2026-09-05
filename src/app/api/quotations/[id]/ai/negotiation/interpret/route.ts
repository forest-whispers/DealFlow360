import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { interpretNegotiationMessageInputSchema } from "@/server/modules/ai/negotiation/negotiation.validation";
import { negotiationInterpreterService } from "@/server/modules/ai/negotiation/negotiation.service";

/**
 * Supported roles for negotiation interpretation:
 * - CUSTOMER: strictly allowed for their own quotation.
 * - Internal roles: SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS, ADMIN.
 */
const ALLOWED_NEGOTIATION_ROLES = [
    UserRole.CUSTOMER,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
    UserRole.ADMIN,
] as const;

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...ALLOWED_NEGOTIATION_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const body = await parseBody(
            request,
            interpretNegotiationMessageInputSchema
        );

        const mockMode =
            process.env.NODE_ENV !== "production"
                ? request.headers.get("x-mock-ai-mode") ?? undefined
                : undefined;

        const result = await negotiationInterpreterService.interpretMessage(
            user,
            id,
            body,
            { mockMode }
        );

        return ok(result);
    }
);
