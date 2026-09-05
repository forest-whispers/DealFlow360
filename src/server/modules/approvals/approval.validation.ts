import { z } from "zod";

export const approvalRequestIdParamSchema = z.object({
    id: z
        .string({
            message: "Approval request ID is required.",
        })
        .trim()
        .min(1, "Approval request ID is required."),
});

export const approveStepSchema = z
    .object({
        reason: z
            .string()
            .trim()
            .max(1000, "Reason cannot exceed 1000 characters.")
            .optional(),
    })
    .strict();

export const rejectStepSchema = z
    .object({
        reason: z
            .string({
                message: "Reason is required for rejection.",
            })
            .trim()
            .min(1, "Reason is required for rejection.")
            .max(1000, "Reason cannot exceed 1000 characters."),
    })
    .strict();
