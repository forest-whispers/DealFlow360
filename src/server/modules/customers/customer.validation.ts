import { z } from "zod";
import {
    DEFAULT_CUSTOMER_LIMIT,
    DEFAULT_CUSTOMER_PAGE,
    MAX_CUSTOMER_LIMIT,
} from "./customer.constants";

export const customerTierSchema = z.enum(["BRONZE", "SILVER", "GOLD"] as const, {
    message: "Invalid customer tier.",
});

export const customerIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Customer ID is required."),
});

export const listCustomersSchema = z.object({
    page: z
        .coerce
        .number()
        .int("Page must be an integer.")
        .min(1, "Page must be at least 1.")
        .default(DEFAULT_CUSTOMER_PAGE),

    limit: z
        .coerce
        .number()
        .int("Limit must be an integer.")
        .min(1, "Limit must be at least 1.")
        .max(MAX_CUSTOMER_LIMIT, `Limit cannot exceed ${MAX_CUSTOMER_LIMIT}.`)
        .default(DEFAULT_CUSTOMER_LIMIT),

    search: z
        .string()
        .trim()
        .min(1)
        .optional(),

    tier: customerTierSchema.optional(),

    isActive: z
        .union([
            z.boolean(),
            z
                .enum(["true", "false"])
                .transform((val) => val === "true"),
        ])
        .optional(),
});

export const createCustomerSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters.")
            .max(100, "Name cannot exceed 100 characters."),

        email: z
            .string()
            .trim()
            .email("Invalid email address.")
            .transform((value) => value.toLowerCase()),

        password: z
            .string()
            .min(8, "Password must contain at least 8 characters.")
            .max(128, "Password cannot exceed 128 characters."),

        customerTier: customerTierSchema.optional().default("BRONZE"),

        customerProfile: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional(),
    })
    .strict();

export const updateCustomerSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must contain at least 2 characters.")
            .max(100, "Name cannot exceed 100 characters.")
            .optional(),

        email: z
            .string()
            .trim()
            .email("Invalid email address.")
            .transform((value) => value.toLowerCase())
            .optional(),

        customerTier: customerTierSchema.optional(),

        customerProfile: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional(),

        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field must be provided for update.",
        },
    );

export const updateCustomerStatusSchema = z
    .object({
        isActive: z.boolean({
            message: "isActive is required and must be a boolean.",
        }),
    })
    .strict();
