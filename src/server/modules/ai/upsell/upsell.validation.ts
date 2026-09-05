import { z } from "zod";
import { UpsellFit } from "./upsell.types";

export const productRecommendationSchema = z
    .object({
        productId: z
            .string({ message: "Product ID is required." })
            .trim()
            .min(1, "Product ID must not be empty."),
        fit: z.nativeEnum(UpsellFit, {
            message: "Invalid fit value. Must be HIGH, MEDIUM, or LOW.",
        }),
        reason: z
            .string({ message: "Reason is required." })
            .trim()
            .min(1, "Reason must not be empty.")
            .max(500, "Reason must be 500 characters or less."),
    })
    .strict();

export const upsellRecommendationResultSchema = z
    .object({
        summary: z
            .string({ message: "Summary is required." })
            .trim()
            .min(1, "Summary must not be empty.")
            .max(1000, "Summary must be 1000 characters or less."),
        recommendations: z
            .array(productRecommendationSchema)
            .max(3, "At most 3 recommendations are allowed."),
    })
    .strict();

export type UpsellRecommendationResultSchema = z.infer<
    typeof upsellRecommendationResultSchema
>;

/**
 * Provider-specific JSON schema passed to Gemini to steer structured output generation.
 */
export const upsellRecommendationJsonSchema = {
    type: "OBJECT",
    properties: {
        summary: { type: "STRING" },
        recommendations: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    productId: { type: "STRING" },
                    fit: {
                        type: "STRING",
                        enum: Object.values(UpsellFit),
                    },
                    reason: { type: "STRING" },
                },
                required: ["productId", "fit", "reason"],
            },
        },
    },
    required: ["summary", "recommendations"],
};
