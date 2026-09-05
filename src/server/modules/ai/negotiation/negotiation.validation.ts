import { z } from "zod";
import {
    NegotiationChangeType,
    NegotiationInterpretationStatus,
} from "./negotiation.types";

/**
 * Request body schema for negotiation interpretation endpoint.
 * Strictly accepts only the customer's natural-language message.
 */
export const interpretNegotiationMessageInputSchema = z
    .object({
        message: z
            .string({
                message: "Negotiation message is required.",
            })
            .trim()
            .min(1, "Negotiation message must not be empty.")
            .max(2000, "Negotiation message cannot exceed 2000 characters."),
    })
    .strict();

export type InterpretNegotiationMessageInput = z.infer<
    typeof interpretNegotiationMessageInputSchema
>;

/**
 * Zod schema for individual line discount change.
 */
const lineDiscountChangeSchema = z
    .object({
        type: z.literal(NegotiationChangeType.LINE_DISCOUNT),
        lineNumber: z.number().int().min(1, "Line number must be >= 1."),
        discountPercent: z
            .number()
            .min(0, "Discount percent must be at least 0.")
            .max(100, "Discount percent cannot exceed 100.")
            .refine((val) => Number.isFinite(val), "Discount percent must be a finite number."),
    })
    .strict();

/**
 * Zod schema for individual line quantity change.
 */
const lineQuantityChangeSchema = z
    .object({
        type: z.literal(NegotiationChangeType.LINE_QUANTITY),
        lineNumber: z.number().int().min(1, "Line number must be >= 1."),
        quantity: z
            .number()
            .int("Quantity must be an integer.")
            .min(1, "Quantity must be at least 1.")
            .refine((val) => Number.isFinite(val), "Quantity must be a finite number."),
    })
    .strict();

export const negotiationChangeSchema = z.discriminatedUnion("type", [
    lineDiscountChangeSchema,
    lineQuantityChangeSchema,
]);

/**
 * Raw change schema from provider (where discountPercent or quantity may be present optionally
 * on the JSON object before discriminating into typed changes).
 */
const rawNegotiationChangeSchema = z
    .object({
        type: z.enum([
            NegotiationChangeType.LINE_DISCOUNT,
            NegotiationChangeType.LINE_QUANTITY,
        ]),
        lineNumber: z.number().int().min(1, "Line number must be >= 1."),
        discountPercent: z.number().optional().nullable(),
        quantity: z.number().optional().nullable(),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.type === NegotiationChangeType.LINE_DISCOUNT) {
            if (
                data.discountPercent === undefined ||
                data.discountPercent === null ||
                !Number.isFinite(data.discountPercent) ||
                data.discountPercent < 0 ||
                data.discountPercent > 100
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "LINE_DISCOUNT requires discountPercent between 0 and 100.",
                    path: ["discountPercent"],
                });
            }
        } else if (data.type === NegotiationChangeType.LINE_QUANTITY) {
            if (
                data.quantity === undefined ||
                data.quantity === null ||
                !Number.isInteger(data.quantity) ||
                data.quantity < 1
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "LINE_QUANTITY requires positive integer quantity >= 1.",
                    path: ["quantity"],
                });
            }
        }
    })
    .transform((data) => {
        if (data.type === NegotiationChangeType.LINE_DISCOUNT) {
            return {
                type: "LINE_DISCOUNT" as const,
                lineNumber: data.lineNumber,
                discountPercent: Number(data.discountPercent),
            };
        }
        return {
            type: "LINE_QUANTITY" as const,
            lineNumber: data.lineNumber,
            quantity: Number(data.quantity),
        };
    });

/**
 * Authoritative Application Zod Schema for Negotiation Interpretation Result.
 * Treat every model output as untrusted input.
 */
export const negotiationInterpretationResultSchema = z
    .object({
        status: z.enum([
            NegotiationInterpretationStatus.INTERPRETED,
            NegotiationInterpretationStatus.AMBIGUOUS,
            NegotiationInterpretationStatus.UNSUPPORTED,
        ]),
        intent: z
            .object({
                changes: z.array(rawNegotiationChangeSchema),
            })
            .strict()
            .nullable(),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.status === NegotiationInterpretationStatus.INTERPRETED) {
            if (!data.intent || !data.intent.changes || data.intent.changes.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "INTERPRETED status requires a non-null intent with at least one change.",
                    path: ["intent"],
                });
            }
        } else {
            if (data.intent !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${data.status} status must have intent set to null.`,
                    path: ["intent"],
                });
            }
        }
    });

/**
 * Gemini Provider Structured Output JSON Schema.
 * Constrains provider output shape strictly without replacing application Zod validation.
 */
export const negotiationInterpretationJsonSchema: Record<string, unknown> = {
    type: "OBJECT",
    properties: {
        status: {
            type: "STRING",
            enum: [
                NegotiationInterpretationStatus.INTERPRETED,
                NegotiationInterpretationStatus.AMBIGUOUS,
                NegotiationInterpretationStatus.UNSUPPORTED,
            ],
        },
        intent: {
            type: "OBJECT",
            nullable: true,
            properties: {
                changes: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            type: {
                                type: "STRING",
                                enum: [
                                    NegotiationChangeType.LINE_DISCOUNT,
                                    NegotiationChangeType.LINE_QUANTITY,
                                ],
                            },
                            lineNumber: {
                                type: "INTEGER",
                            },
                            discountPercent: {
                                type: "NUMBER",
                            },
                            quantity: {
                                type: "INTEGER",
                            },
                        },
                        required: ["type", "lineNumber"],
                    },
                },
            },
            required: ["changes"],
        },
    },
    required: ["status"],
};

/**
 * Request body schema for deterministic negotiation execution endpoint.
 */
export const executeNegotiationIntentInputSchema = z
    .object({
        sourceRevisionId: z
            .string({
                message: "sourceRevisionId is required.",
            })
            .trim()
            .min(1, "sourceRevisionId must not be empty."),
        sourceRevisionNumber: z
            .number({
                message: "sourceRevisionNumber is required.",
            })
            .int("sourceRevisionNumber must be an integer.")
            .min(1, "sourceRevisionNumber must be >= 1."),
        changes: z
            .array(negotiationChangeSchema, {
                message: "changes must be an array.",
            })
            .min(1, "At least one change is required to execute negotiation."),
    })
    .strict();

export type ExecuteNegotiationIntentInputDto = z.infer<
    typeof executeNegotiationIntentInputSchema
>;
