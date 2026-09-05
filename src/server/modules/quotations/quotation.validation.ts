import { z } from "zod";
import { discountPercentSchema } from "@/server/modules/discount-governance/discount-governance.validation";
import {
    DEFAULT_QUOTATION_LIMIT,
    DEFAULT_QUOTATION_PAGE,
    MAX_QUOTATION_LIMIT,
} from "./quotation.constants";

export const quotationIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Quotation ID is required."),
});

export const quotationLineParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Quotation ID is required."),
    lineNumber: z.coerce
        .number({
            message: "Line number must be a valid number.",
        })
        .int("Line number must be an integer.")
        .min(1, "Line number must be a positive integer."),
});

export const createQuotationSchema = z
    .object({
        customerId: z
            .string({
                message: "Customer ID is required.",
            })
            .trim()
            .min(1, "Customer ID is required."),
    })
    .strict();

export const linePreviewSchema = z
    .object({
        lineId: z
            .number({
                message: "Line ID is required.",
            })
            .int("Line ID must be an integer.")
            .min(1, "Line ID must be a positive integer."),

        productId: z
            .string({
                message: "Product ID is required.",
            })
            .trim()
            .min(1, "Product ID is required."),

        variantId: z
            .string()
            .trim()
            .min(1)
            .nullable()
            .optional(),

        quantity: z
            .number({
                message: "Quantity is required.",
            })
            .int("Quantity must be an integer.")
            .positive("Quantity must be greater than zero."),

        discountPercent: discountPercentSchema,
    })
    .strict();

export const draftLineSchema = z
    .object({
        lineNumber: z
            .number({
                message: "Line number is required.",
            })
            .int("Line number must be an integer.")
            .min(1, "Line number must be a positive integer."),

        productId: z
            .string({
                message: "Product ID is required.",
            })
            .trim()
            .min(1, "Product ID is required."),

        variantId: z
            .string()
            .trim()
            .min(1)
            .nullable()
            .optional(),

        quantity: z
            .number({
                message: "Quantity is required.",
            })
            .int("Quantity must be an integer.")
            .positive("Quantity must be greater than zero."),

        discountPercent: discountPercentSchema,
    })
    .strict();

export const saveDraftSchema = z
    .object({
        lines: z.array(draftLineSchema, {
            message: "Lines must be an array.",
        }),
        orderDiscountPercent: discountPercentSchema.optional().default(0),
    })
    .strict();

export const previewDraftSchema = z
    .object({
        lines: z.array(draftLineSchema, {
            message: "Lines must be an array.",
        }),
        orderDiscountPercent: discountPercentSchema.optional().default(0),
    })
    .strict();

export const recalculateLineSchema = z
    .object({
        quantity: z
            .number({
                message: "Quantity is required.",
            })
            .int("Quantity must be an integer.")
            .positive("Quantity must be greater than zero."),

        discountPercent: discountPercentSchema,
    })
    .strict();

export const listQuotationsSchema = z.object({
    page: z.coerce
        .number()
        .int("Page must be an integer.")
        .min(1, "Page must be at least 1.")
        .default(DEFAULT_QUOTATION_PAGE),

    limit: z.coerce
        .number()
        .int("Limit must be an integer.")
        .min(1, "Limit must be at least 1.")
        .max(
            MAX_QUOTATION_LIMIT,
            `Limit cannot exceed ${MAX_QUOTATION_LIMIT}.`,
        )
        .default(DEFAULT_QUOTATION_LIMIT),

    status: z
        .enum([
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "SENT",
            "UNDER_NEGOTIATION",
            "CONFIRMED",
        ] as const)
        .optional(),

    customerId: z
        .string()
        .trim()
        .min(1)
        .optional(),

    search: z
        .string()
        .trim()
        .min(1)
        .optional(),
});
