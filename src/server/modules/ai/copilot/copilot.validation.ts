import { z } from "zod";
import {
    CopilotEvidenceSource,
    CopilotIntentType,
} from "./copilot.constants";

/**
 * Request body schema for the copilot endpoint.
 */
export const copilotRequestInputSchema = z
    .object({
        message: z
            .string({ message: "Message is required." })
            .trim()
            .min(1, "Message must not be empty.")
            .max(2000, "Message cannot exceed 2000 characters."),
    })
    .strict();

export type CopilotRequestInputDto = z.infer<typeof copilotRequestInputSchema>;

/**
 * Stage 1: Structured Intent Schemas
 */
const dealSummaryIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.DEAL_SUMMARY),
        negotiationMessage: z.string().nullable().optional(),
    });

const dealRiskIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.DEAL_RISK),
        negotiationMessage: z.string().nullable().optional(),
    });

const nextActionIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.NEXT_ACTION),
        negotiationMessage: z.string().nullable().optional(),
    });

const upsellIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.UPSELL),
        negotiationMessage: z.string().nullable().optional(),
    });

const negotiationAdviceIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.NEGOTIATION_ADVICE),
        negotiationMessage: z
            .string({ message: "negotiationMessage is required for NEGOTIATION_ADVICE." })
            .trim()
            .min(1, "negotiationMessage must not be empty."),
    });

const unsupportedIntentSchema = z
    .object({
        type: z.literal(CopilotIntentType.UNSUPPORTED),
        negotiationMessage: z.string().nullable().optional(),
    });

export const copilotIntentSchema = z.discriminatedUnion("type", [
    dealSummaryIntentSchema,
    dealRiskIntentSchema,
    nextActionIntentSchema,
    upsellIntentSchema,
    negotiationAdviceIntentSchema,
    unsupportedIntentSchema,
]);

/**
 * Provider JSON Schema for Stage 1 (Gemini structured output).
 */
export const copilotIntentJsonSchema: Record<string, unknown> = {
    type: "OBJECT",
    properties: {
        type: {
            type: "STRING",
            enum: [
                CopilotIntentType.DEAL_SUMMARY,
                CopilotIntentType.DEAL_RISK,
                CopilotIntentType.NEXT_ACTION,
                CopilotIntentType.UPSELL,
                CopilotIntentType.NEGOTIATION_ADVICE,
                CopilotIntentType.UNSUPPORTED,
            ],
        },
        negotiationMessage: {
            type: "STRING",
            nullable: true,
        },
    },
    required: ["type"],
};

/**
 * Stage 2: Structured Copilot Response Schemas
 */
export const copilotEvidenceSchema = z
    .object({
        source: z.enum([
            CopilotEvidenceSource.DEAL_HEALTH,
            CopilotEvidenceSource.RISK_EXPLANATION,
            CopilotEvidenceSource.NEGOTIATION_PREVIEW,
            CopilotEvidenceSource.UPSELL,
            CopilotEvidenceSource.DEAL_CONTEXT,
        ]),
        fact: z
            .string({ message: "Citation fact must be a string." })
            .trim()
            .min(1, "Citation fact must not be empty."),
    })
    .strict();

export const copilotActionSchema = z
    .object({
        label: z
            .string({ message: "Action label must be a string." })
            .trim()
            .min(1, "Action label must not be empty.")
            .max(100, "Action label cannot exceed 100 characters."),
        description: z
            .string({ message: "Action description must be a string." })
            .trim()
            .min(1, "Action description must not be empty.")
            .max(500, "Action description cannot exceed 500 characters."),
    })
    .strict();

export const copilotResponseSchema = z
    .object({
        intent: z.enum([
            CopilotIntentType.DEAL_SUMMARY,
            CopilotIntentType.DEAL_RISK,
            CopilotIntentType.NEXT_ACTION,
            CopilotIntentType.UPSELL,
            CopilotIntentType.NEGOTIATION_ADVICE,
            CopilotIntentType.UNSUPPORTED,
        ]),
        answer: z
            .string({ message: "Answer is required." })
            .trim()
            .min(1, "Answer must not be empty.")
            .max(5000, "Answer cannot exceed 5000 characters."),
        citations: z.array(copilotEvidenceSchema).default([]),
        actions: z.array(copilotActionSchema).optional(),
    })
    .strict();

/**
 * Provider JSON Schema for Stage 2 (Gemini structured output).
 */
export const copilotResponseJsonSchema: Record<string, unknown> = {
    type: "OBJECT",
    properties: {
        intent: {
            type: "STRING",
            enum: [
                CopilotIntentType.DEAL_SUMMARY,
                CopilotIntentType.DEAL_RISK,
                CopilotIntentType.NEXT_ACTION,
                CopilotIntentType.UPSELL,
                CopilotIntentType.NEGOTIATION_ADVICE,
                CopilotIntentType.UNSUPPORTED,
            ],
        },
        answer: {
            type: "STRING",
        },
        citations: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    source: {
                        type: "STRING",
                        enum: [
                            CopilotEvidenceSource.DEAL_HEALTH,
                            CopilotEvidenceSource.RISK_EXPLANATION,
                            CopilotEvidenceSource.NEGOTIATION_PREVIEW,
                            CopilotEvidenceSource.UPSELL,
                            CopilotEvidenceSource.DEAL_CONTEXT,
                        ],
                    },
                    fact: {
                        type: "STRING",
                    },
                },
                required: ["source", "fact"],
            },
        },
        actions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    label: {
                        type: "STRING",
                    },
                    description: {
                        type: "STRING",
                    },
                },
                required: ["label", "description"],
            },
        },
    },
    required: ["intent", "answer", "citations"],
};
