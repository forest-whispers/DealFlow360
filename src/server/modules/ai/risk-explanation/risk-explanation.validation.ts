import { z } from "zod";
import {
    DealRiskFactorType,
    DealRiskSeverity,
} from "@/server/modules/deal-intelligence/deal-intelligence.types";

export const dealKeyRiskSchema = z
    .object({
        factor: z.nativeEnum(DealRiskFactorType, {
            message: "Invalid risk factor type.",
        }),
        severity: z.nativeEnum(DealRiskSeverity, {
            message: "Invalid risk severity.",
        }),
        explanation: z
            .string({ message: "Risk explanation is required." })
            .trim()
            .min(1, "Risk explanation must not be empty.")
            .max(500, "Risk explanation must be 500 characters or less."),
    })
    .strict();

export const dealRecommendedActionSchema = z
    .object({
        priority: z
            .number({ message: "Priority is required." })
            .int("Priority must be an integer.")
            .min(1, "Priority must be at least 1.")
            .max(5, "Priority cannot exceed 5."),
        action: z
            .string({ message: "Action is required." })
            .trim()
            .min(1, "Action must not be empty.")
            .max(300, "Action must be 300 characters or less."),
        reason: z
            .string({ message: "Reason is required." })
            .trim()
            .min(1, "Reason must not be empty.")
            .max(500, "Reason must be 500 characters or less."),
    })
    .strict();

export const dealRiskExplanationSchema = z
    .object({
        summary: z
            .string({ message: "Summary is required." })
            .trim()
            .min(1, "Summary must not be empty.")
            .max(1000, "Summary must be 1000 characters or less."),
        keyRisks: z
            .array(dealKeyRiskSchema)
            .max(6, "Key risks cannot exceed the maximum number of risk dimensions (6)."),
        recommendedActions: z
            .array(dealRecommendedActionSchema)
            .min(1, "At least one recommended action is required.")
            .max(5, "At most 5 recommended actions are allowed."),
    })
    .strict();

export type DealRiskExplanationSchema = z.infer<typeof dealRiskExplanationSchema>;

/**
 * Provider-specific JSON schema passed to Gemini to steer structured output generation.
 */
export const dealRiskExplanationJsonSchema = {
    type: "OBJECT",
    properties: {
        summary: { type: "STRING" },
        keyRisks: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    factor: {
                        type: "STRING",
                        enum: Object.values(DealRiskFactorType),
                    },
                    severity: {
                        type: "STRING",
                        enum: Object.values(DealRiskSeverity),
                    },
                    explanation: { type: "STRING" },
                },
                required: ["factor", "severity", "explanation"],
            },
        },
        recommendedActions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    priority: { type: "INTEGER" },
                    action: { type: "STRING" },
                    reason: { type: "STRING" },
                },
                required: ["priority", "action", "reason"],
            },
        },
    },
    required: ["summary", "keyRisks", "recommendedActions"],
};
