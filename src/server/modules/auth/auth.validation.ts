import { z } from "zod";

export const signupSchema = z.object({
    organizationName: z
        .string()
        .trim()
        .min(
            2,
            "Organization name must contain at least 2 characters.",
        )
        .max(100),

    organizationSlug: z
        .string()
        .trim()
        .min(
            2,
            "Organization slug must contain at least 2 characters.",
        )
        .max(50)
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Organization slug can contain lowercase letters, numbers, and hyphens.",
        ),

    name: z
        .string()
        .trim()
        .min(
            2,
            "Name must contain at least 2 characters.",
        )
        .max(100),

    email: z
        .string()
        .trim()
        .email("Invalid email address.")
        .transform((value) => value.toLowerCase()),

    password: z
        .string()
        .min(
            8,
            "Password must contain at least 8 characters.",
        )
        .max(128),
});

export const loginSchema = z.object({
    organizationSlug: z
        .string()
        .trim()
        .min(2, "Organization slug is required.")
        .max(50),

    email: z
        .string()
        .trim()
        .email("Invalid email address.")
        .transform((value) => value.toLowerCase()),

    password: z
        .string()
        .min(1, "Password is required."),
});