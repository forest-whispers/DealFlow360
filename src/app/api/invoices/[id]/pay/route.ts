import { NextRequest } from "next/server";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { BadRequestError } from "@/server/shared/errors/errors";
import { billingService } from "@/server/modules/billing/billing.service";
import {
    invoiceIdParamSchema,
    payInvoiceSchema,
} from "@/server/modules/billing/billing.validation";
import { INVOICE_PAY_ROLES } from "@/server/modules/billing/billing.constants";

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...INVOICE_PAY_ROLES);
        const rawParams = await context.params;
        const { id } = invoiceIdParamSchema.parse(rawParams);

        let body: unknown = {};
        const text = await request.text();
        if (text.trim().length > 0) {
            try {
                body = JSON.parse(text);
            } catch {
                throw new BadRequestError("Invalid JSON request body.");
            }
        }
        const validatedBody = payInvoiceSchema.parse(body);

        const payment = await billingService.payInvoice(user, id);
        return ok(payment);
    },
);
