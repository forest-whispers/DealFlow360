import { z } from "zod";
import {
    DEFAULT_USER_LIMIT,
    DEFAULT_USER_PAGE,
    INTERNAL_USER_ROLES,
    MAX_USER_LIMIT,
} from "./user.constants";

export const userIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "User ID is required."),
});

export const listUsersSchema = z.object({
    page: z.coerce
        .number()
        .int("Page must be an integer.")
        .min(1, "Page must be at least 1.")
        .default(DEFAULT_USER_PAGE),

    limit: z.coerce
        .number()
        .int("Limit must be an integer.")
        .min(1, "Limit must be at least 1.")
        .max(MAX_USER_LIMIT, `Limit cannot exceed ${MAX_USER_LIMIT}.`)
        .default(DEFAULT_USER_LIMIT),

    search: z
        .string()
        .trim()
        .min(1)
        .optional(),

    role: z.enum(INTERNAL_USER_ROLES).optional(),

    isActive: z
        .union([
            z.boolean(),
            z
                .enum(["true", "false"])
                .transform((val) => val === "true"),
        ])
        .optional(),
});

export const changeUserRoleSchema = z
    .object({
        role: z.enum(INTERNAL_USER_ROLES, {
            message:
                "Invalid role. Target role must be ADMIN, SALES_REP, SALES_MANAGER, or FINANCE_OPERATIONS.",
        }),
    })
    .strict();

export const updateUserStatusSchema = z
    .object({
        isActive: z.boolean({
            message: "isActive is required and must be a boolean.",
        }),
    })
    .strict();
