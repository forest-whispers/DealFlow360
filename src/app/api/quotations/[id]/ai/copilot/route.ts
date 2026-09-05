import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { quotationIdParamSchema } from "@/server/modules/quotations/quotation.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { parseBody } from "@/server/shared/http/parseBody";
import { copilotRequestInputSchema } from "@/server/modules/ai/copilot/copilot.validation";
import { copilotService } from "@/server/modules/ai/copilot/copilot.service";

/**
 * Allowed roles for AI Deal Copilot:
 * - CUSTOMER (strictly scoped to their own quotation via customerId check)
 * - Internal roles: SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS, ADMIN
 */
const ALLOWED_COPILOT_ROLES = [
    UserRole.CUSTOMER,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
    UserRole.ADMIN,
] as const;

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...ALLOWED_COPILOT_ROLES);
        const rawParams = await context.params;
        const { id } = quotationIdParamSchema.parse(rawParams);
        const body = await parseBody(request, copilotRequestInputSchema);

        const mockMode =
            process.env.NODE_ENV !== "production"
                ? request.headers.get("x-mock-ai-mode") ?? undefined
                : undefined;

        const result = await copilotService.processMessage(
            user,
            id,
            body,
            { mockMode },
        );

        return ok(result);
    },
);
