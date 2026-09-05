import { z } from "zod";
import {
    DEFAULT_PRODUCT_LIMIT,
    DEFAULT_PRODUCT_PAGE,
    MAX_PRICE,
    MAX_PRODUCT_LIMIT,
    MIN_PRICE,
} from "./product.constants";

export const billingTypeSchema = z.enum(["ONE_TIME", "RECURRING"] as const, {
    message: "Invalid billing type.",
});

export const priceSchema = z
    .number({
        message: "Price must be a valid number.",
    })
    .min(MIN_PRICE, `Price must be at least ${MIN_PRICE}.`)
    .max(MAX_PRICE, `Price cannot exceed ${MAX_PRICE}.`)
    .refine(
        (val) => Number(val.toFixed(2)) === val,
        { message: "Price cannot have more than 2 decimal places." },
    );

export const skuSchema = z
    .string({
        message: "SKU is required.",
    })
    .trim()
    .min(1, "SKU is required.")
    .max(50, "SKU cannot exceed 50 characters.")
    .transform((val) => val.toUpperCase())
    .refine(
        (val) => /^[A-Z0-9_-]+$/.test(val),
        { message: "SKU can only contain alphanumeric characters, hyphens, and underscores." },
    );

export const productIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Product ID is required."),
});

export const productVariantParamsSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Product ID is required."),
    variantId: z
        .string()
        .trim()
        .min(1, "Variant ID is required."),
});

import { BillingInterval } from "@prisma/client";

export const billingIntervalSchema = z.nativeEnum(BillingInterval, {
    message: "Invalid billing interval. Must be MONTHLY, QUARTERLY, or YEARLY.",
});

export const listProductsSchema = z.object({
    page: z
        .coerce
        .number()
        .int("Page must be an integer.")
        .min(1, "Page must be at least 1.")
        .default(DEFAULT_PRODUCT_PAGE),

    limit: z
        .coerce
        .number()
        .int("Limit must be an integer.")
        .min(1, "Limit must be at least 1.")
        .max(MAX_PRODUCT_LIMIT, `Limit cannot exceed ${MAX_PRODUCT_LIMIT}.`)
        .default(DEFAULT_PRODUCT_LIMIT),

    search: z
        .string()
        .trim()
        .min(1)
        .optional(),

    category: z
        .string()
        .trim()
        .min(1)
        .optional(),

    billingType: billingTypeSchema.optional(),

    billingInterval: billingIntervalSchema.optional(),

    isActive: z
        .union([
            z.boolean(),
            z
                .enum(["true", "false"])
                .transform((val) => val === "true"),
        ])
        .optional(),
});

export const createProductSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters.")
            .max(150, "Name cannot exceed 150 characters."),

        description: z
            .string()
            .trim()
            .max(2000, "Description cannot exceed 2000 characters.")
            .nullable()
            .optional(),

        category: z
            .string()
            .trim()
            .min(2, "Category must contain at least 2 characters.")
            .max(50, "Category cannot exceed 50 characters."),

        basePrice: priceSchema,

        costPrice: priceSchema,

        billingType: billingTypeSchema.optional().default("ONE_TIME"),

        billingInterval: billingIntervalSchema.nullable().optional(),

        isActive: z.boolean().optional().default(true),
    })
    .strict()
    .refine(
        (data) => {
            if (data.billingType === "RECURRING") {
                return !!data.billingInterval;
            }
            if (data.billingType === "ONE_TIME") {
                return !data.billingInterval;
            }
            return true;
        },
        {
            message:
                "Billing interval is required for RECURRING products and must be omitted for ONE_TIME products.",
            path: ["billingInterval"],
        },
    );

export const updateProductSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters.")
            .max(150, "Name cannot exceed 150 characters.")
            .optional(),

        description: z
            .string()
            .trim()
            .max(2000, "Description cannot exceed 2000 characters.")
            .nullable()
            .optional(),

        category: z
            .string()
            .trim()
            .min(2, "Category must contain at least 2 characters.")
            .max(50, "Category cannot exceed 50 characters.")
            .optional(),

        basePrice: priceSchema.optional(),

        costPrice: priceSchema.optional(),

        billingType: billingTypeSchema.optional(),

        billingInterval: billingIntervalSchema.nullable().optional(),

        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update.",
        },
    )
    .refine(
        (data) => {
            if (data.billingType === "RECURRING" && data.billingInterval === null) {
                return false;
            }
            if (data.billingType === "ONE_TIME" && data.billingInterval) {
                return false;
            }
            return true;
        },
        {
            message:
                "Billing interval is required for RECURRING products and must be omitted for ONE_TIME products.",
            path: ["billingInterval"],
        },
    );

export const updateProductStatusSchema = z
    .object({
        isActive: z.boolean({
            message: "isActive is required and must be a boolean.",
        }),
    })
    .strict();

export const createVariantSchema = z
    .object({
        sku: skuSchema,

        name: z
            .string()
            .trim()
            .min(1, "Variant name/label is required.")
            .max(150, "Variant name cannot exceed 150 characters."),

        price: priceSchema,

        cost: priceSchema,

        isActive: z.boolean().optional().default(true),

        attributes: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional(),
    })
    .strict();

export const updateVariantSchema = z
    .object({
        sku: skuSchema.optional(),

        name: z
            .string()
            .trim()
            .min(1, "Variant name/label is required.")
            .max(150, "Variant name cannot exceed 150 characters.")
            .optional(),

        price: priceSchema.optional(),

        cost: priceSchema.optional(),

        isActive: z.boolean().optional(),

        attributes: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional(),
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update.",
        },
    );

export const updateVariantStatusSchema = z
    .object({
        isActive: z.boolean({
            message: "isActive is required and must be a boolean.",
        }),
    })
    .strict();
