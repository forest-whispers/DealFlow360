/**
 * AI Deal Copilot Intent Interpreter (Stage 1)
 *
 * Classifies user questions into strictly typed, bounded CopilotIntents.
 * The LLM only classifies the query; it performs zero domain calculations or mutations.
 */

import { AIService, aiService } from "@/server/modules/ai/ai.service";
import {
    AITimeoutError,
    AIProviderError,
    AIInvalidResponseError,
} from "@/server/modules/ai/ai.errors";
import {
    CopilotIntentType,
    COPILOT_DEFAULT_TIMEOUT_MS,
    COPILOT_MOCK_MODES,
} from "./copilot.constants";
import type { CopilotIntent, CopilotOptions } from "./copilot.types";
import {
    copilotIntentJsonSchema,
    copilotIntentSchema,
} from "./copilot.validation";

const SYSTEM_INSTRUCTION = `You are the DealFlow360 Copilot Intent Interpreter.
Your sole job is to classify the user's message regarding a sales deal/quotation into one of the following 6 supported intents:

1. DEAL_SUMMARY:
   User asks for general status, summary, overview, or what is happening with the deal.
   Examples: "What's happening with this deal?", "Give me a summary", "Overview of this quote".

2. DEAL_RISK:
   User asks about deal risks, why the deal is flagged, risk factors, or deal health.
   Examples: "Why is this deal at risk?", "What are the biggest risks?", "Is this deal healthy?".

3. NEXT_ACTION:
   User asks what to do next, what is blocking the deal, who needs to approve, or workflow steps.
   Examples: "What should I do next?", "What's blocking this deal?", "Who needs to approve this?".

4. UPSELL:
   User asks for complementary product recommendations, cross-sell ideas, or what else to sell.
   Examples: "What can I upsell?", "What else can I sell this customer?", "Any add-on suggestions?".

5. NEGOTIATION_ADVICE:
   User asks for discount advice, price changes, quantity changes, or commercial what-if scenarios.
   When classified as NEGOTIATION_ADVICE, set negotiationMessage to the user's negotiation text.
   Examples: "Can we give them 18% off laptops?", "What happens if we offer 20% discount?", "Can we approve 15% off?".

6. UNSUPPORTED:
   The query is outside the DealFlow360 quotation/deal domain (e.g. general chit-chat, weather, coding, non-sales topics).

Return a JSON object conforming to the schema with "type" and optional "negotiationMessage".`;

export class CopilotInterpreterService {
    constructor(private readonly ai: AIService = aiService) {}

    /**
     * Interprets a user's question into a structured CopilotIntent.
     */
    async interpretIntent(
        userMessage: string,
        options?: CopilotOptions,
    ): Promise<CopilotIntent> {
        // Deterministic mock handling for testing in non-production
        if (options?.mockMode && process.env.NODE_ENV !== "production") {
            return this.handleMockMode(userMessage, options.mockMode);
        }

        const userPrompt = `User question: "${userMessage.trim()}"`;

        return this.ai.generateStructured<CopilotIntent>({
            systemInstruction: SYSTEM_INSTRUCTION,
            userPrompt,
            schema: copilotIntentSchema,
            responseSchema: copilotIntentJsonSchema,
            temperature: 0.1,
            timeoutMs: COPILOT_DEFAULT_TIMEOUT_MS,
        });
    }

    private handleMockMode(
        userMessage: string,
        mockMode: string,
    ): CopilotIntent {
        const normalized = mockMode.toUpperCase().replace(/^MOCK[-_](COPILOT[-_])?/, "");
        switch (normalized) {
            case "SUMMARY":
            case COPILOT_MOCK_MODES.SUMMARY:
                return { type: CopilotIntentType.DEAL_SUMMARY };

            case "RISK":
            case COPILOT_MOCK_MODES.RISK:
                return { type: CopilotIntentType.DEAL_RISK };

            case "NEXT_ACTION":
            case "NEXT-ACTION":
            case COPILOT_MOCK_MODES.NEXT_ACTION:
                return { type: CopilotIntentType.NEXT_ACTION };

            case "UPSELL":
            case COPILOT_MOCK_MODES.UPSELL:
                return { type: CopilotIntentType.UPSELL };

            case "NEGOTIATION":
            case COPILOT_MOCK_MODES.NEGOTIATION:
                return {
                    type: CopilotIntentType.NEGOTIATION_ADVICE,
                    negotiationMessage: userMessage,
                };

            case "UNSUPPORTED":
            case COPILOT_MOCK_MODES.UNSUPPORTED:
                return { type: CopilotIntentType.UNSUPPORTED };

            case "TIMEOUT":
            case COPILOT_MOCK_MODES.TIMEOUT:
                throw new AITimeoutError("AI request exceeded timeout of 15000ms.");

            case "PROVIDER_ERROR":
            case "PROVIDER-ERROR":
            case COPILOT_MOCK_MODES.PROVIDER_ERROR:
                throw new AIProviderError("Simulated provider failure.");

            case "INVALID_RESPONSE":
            case "INVALID-RESPONSE":
            case COPILOT_MOCK_MODES.INVALID_RESPONSE:
                throw new AIInvalidResponseError("Simulated invalid interpreter response.");

            default:
                // If message contains obvious keywords, provide helpful fallback in mock mode
                const lower = userMessage.toLowerCase();
                if (lower.includes("risk") || lower.includes("health")) {
                    return { type: CopilotIntentType.DEAL_RISK };
                }
                if (lower.includes("block") || lower.includes("next") || lower.includes("what should i do")) {
                    return { type: CopilotIntentType.NEXT_ACTION };
                }
                if (
                    lower.includes("upsell") ||
                    lower.includes("else") ||
                    lower.includes("add-on") ||
                    lower.includes("sell") ||
                    lower.includes("recommend") ||
                    lower.includes("complementary")
                ) {
                    return { type: CopilotIntentType.UPSELL };
                }
                if (lower.includes("discount") || lower.includes("off") || lower.includes("%") || lower.includes("negotiat") || lower.includes("price")) {
                    return {
                        type: CopilotIntentType.NEGOTIATION_ADVICE,
                        negotiationMessage: userMessage,
                    };
                }
                if (lower.includes("summary") || lower.includes("happening") || lower.includes("overview") || lower.includes("status")) {
                    return { type: CopilotIntentType.DEAL_SUMMARY };
                }
                return { type: CopilotIntentType.UNSUPPORTED };
        }
    }
}

export const copilotInterpreterService = new CopilotInterpreterService();
