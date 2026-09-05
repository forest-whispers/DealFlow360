import { z } from "zod";
import { discountPercentSchema } from "@/server/modules/discount-governance/discount-governance.validation";
import {
    DEFAULT_PORTAL_LIMIT,
    DEFAULT_PORTAL_PAGE,
    MAX_PORTAL_LIMIT,
} from "./negotiation.constants";

export const portalQuotationParamSchema = z.object({
    id: z
        .string({ message: "Quotation ID is required." })
        .trim()
        .min(1, "Quotation ID is required."),
});

export const createNegotiationMessageSchema = z
    .object({
        message: z
            .string({ message: "Message cannot be empty." })
            .trim()
            .min(1, "Message cannot be empty.")
            .max(2000, "Message cannot exceed 2000 characters."),
    })
    .strict();

export const createChangeRequestSchema = z
    .object({
        lineNumber: z.coerce
            .number({ message: "Line number must be a valid number." })
            .int("Line number must be an integer.")
            .min(1, "Line number must be positive.")
            .optional(),
        quantity: z.coerce
            .number({ message: "Quantity must be a valid number." })
            .int("Quantity must be an integer.")
            .min(1, "Quantity must be at least 1.")
            .optional(),
        discountPercent: discountPercentSchema.optional(),
        orderDiscountPercent: discountPercentSchema.optional(),
        message: z
            .string()
            .trim()
            .max(1000, "Message cannot exceed 1000 characters.")
            .optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
        const hasLineChange =
            data.quantity !== undefined || data.discountPercent !== undefined;
        const hasOrderDiscount = data.orderDiscountPercent !== undefined;

        // Line-level fields require lineNumber
        if (hasLineChange && data.lineNumber === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "Line number is required when specifying line quantity or discount percent.",
                path: ["lineNumber"],
            });
        }

        // lineNumber must be accompanied by quantity or discountPercent
        if (data.lineNumber !== undefined && !hasLineChange) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "Line number must be accompanied by quantity or discount percent.",
                path: ["lineNumber"],
            });
        }

        // At least one commercial change must be requested
        if (!hasLineChange && !hasOrderDiscount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "At least one commercial change (quantity, discountPercent, or orderDiscountPercent) must be specified.",
                path: ["quantity"],
            });
        }
    });

export const portalQuotationListSchema = z.object({
    page: z.coerce
        .number({ message: "Page must be a valid number." })
        .int("Page must be an integer.")
        .min(1, "Page must be at least 1.")
        .default(DEFAULT_PORTAL_PAGE),
    limit: z.coerce
        .number({ message: "Limit must be a valid number." })
        .int("Limit must be an integer.")
        .min(1, "Limit must be at least 1.")
        .max(MAX_PORTAL_LIMIT, `Limit cannot exceed ${MAX_PORTAL_LIMIT}.`)
        .default(DEFAULT_PORTAL_LIMIT),
});
