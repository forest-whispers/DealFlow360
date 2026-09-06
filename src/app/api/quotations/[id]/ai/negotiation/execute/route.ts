import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { executeNegotiationIntentInputSchema } from "@/server/modules/ai/negotiation/negotiation.validation";
import { negotiationExecutionService } from "@/server/modules/ai/negotiation/negotiation.execution.service";

/**
 * Supported roles for authoritative negotiation revision execution:
 * - Internal sales/finance roles: SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS, ADMIN.
 * Customers can only submit proposals via change requests, never authoritatively execute revisions.
 */
const ALLOWED_NEGOTIATION_ROLES = [
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
            executeNegotiationIntentInputSchema,
        );

        const result = await negotiationExecutionService.executeIntent(
            user,
            id,
            body,
        );

        return ok(result);
    },
);
