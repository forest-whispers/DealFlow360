import { z } from "zod";
import {
    MAX_DISCOUNT_PERCENT,
    MIN_DISCOUNT_PERCENT,
} from "./discount-governance.constants";

export const discountPercentSchema = z
    .number({
        message: "Discount percent must be a valid number.",
    })
    .min(
        MIN_DISCOUNT_PERCENT,
        `Discount percent must be at least ${MIN_DISCOUNT_PERCENT}%.`,
    )
    .max(
        MAX_DISCOUNT_PERCENT,
        `Discount percent cannot exceed ${MAX_DISCOUNT_PERCENT}%.`,
    )
    .refine(
        (val) => Number(val.toFixed(2)) === val,
        {
            message: "Discount percent cannot have more than 2 decimal places.",
        },
    );

export const customerTierSchema = z.enum(["BRONZE", "SILVER", "GOLD"] as const, {
    message: "Invalid customer tier. Must be BRONZE, SILVER, or GOLD.",
});

export const evaluateLineItemSchema = z
    .object({
        lineId: z
            .number({
                message: "Line ID is required and must be a number.",
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
            .optional(),

        quantity: z
            .number({
                message: "Quantity is required and must be a number.",
            })
            .positive("Quantity must be greater than zero."),

        discountPercent: discountPercentSchema,
    })
    .strict();

export const evaluateLineSchema = z
    .object({
        customerTier: customerTierSchema,
        line: evaluateLineItemSchema,
    })
    .strict();

export const ruleIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Rule ID is required."),
});

export const createTierRuleSchema = z
    .object({
        customerTier: customerTierSchema,
        maximumDiscountPercent: discountPercentSchema,
    })
    .strict();

export const updateTierRuleSchema = z
    .object({
        maximumDiscountPercent: discountPercentSchema.optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update.",
        },
    );

export const createCategoryRuleSchema = z
    .object({
        category: z
            .string({
                message: "Category is required.",
            })
            .trim()
            .min(1, "Category is required.")
            .max(50, "Category cannot exceed 50 characters."),
        maximumDiscountPercent: discountPercentSchema,
    })
    .strict();

export const updateCategoryRuleSchema = z
    .object({
        maximumDiscountPercent: discountPercentSchema.optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update.",
        },
    );

export const updateApprovalPolicySchema = z
    .object({
        salesManagerThreshold: discountPercentSchema,
        financeOperationsThreshold: discountPercentSchema,
    })
    .strict()
    .refine(
        (data) => data.salesManagerThreshold <= data.financeOperationsThreshold,
        {
            message:
                "Sales Manager threshold cannot exceed Finance Operations threshold.",
            path: ["salesManagerThreshold"],
        },
    );

export const listRulesQuerySchema = z.object({
    isActive: z
        .union([
            z.boolean(),
            z
                .enum(["true", "false"])
                .transform((val) => val === "true"),
        ])
        .optional(),
});
