import { GoogleGenAI, type Schema } from "@google/genai";
import { env } from "@/server/shared/config/env";
import { AIProvider, StructuredGenerationInput } from "../ai.types";
import {
    AIConfigurationError,
    AIInvalidResponseError,
    AIProviderError,
    AIRateLimitedError,
} from "../ai.errors";
import { AI_DEFAULT_MODEL, AI_DEFAULT_TEMPERATURE } from "../ai.constants";

export class GeminiProvider implements AIProvider {
    private client: GoogleGenAI | null = null;
    private readonly modelName: string;
    private readonly explicitApiKey?: string;

    constructor(options?: { apiKey?: string; model?: string }) {
        this.modelName = options?.model ?? env.GEMINI_MODEL ?? AI_DEFAULT_MODEL;
        if (options && "apiKey" in options) {
            this.explicitApiKey = options.apiKey;
            if (options.apiKey) {
                this.client = new GoogleGenAI({ apiKey: options.apiKey });
            }
        }
    }

    private getClient(): GoogleGenAI {
        if (!this.client) {
            const apiKey =
                this.explicitApiKey !== undefined
                    ? this.explicitApiKey
                    : env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new AIConfigurationError("GEMINI_API_KEY is not configured.");
            }
            this.client = new GoogleGenAI({ apiKey });
        }
        return this.client;
    }

    async generateStructured(input: StructuredGenerationInput): Promise<unknown> {
        const client = this.getClient();

        try {
            const response = await client.models.generateContent({
                model: this.modelName,
                contents: input.userPrompt,
                config: {
                    systemInstruction: input.systemInstruction,
                    temperature: input.temperature ?? AI_DEFAULT_TEMPERATURE,
                    responseMimeType: "application/json",
                    ...(input.responseSchema ? { responseSchema: input.responseSchema as Schema } : {}),
                },
            });

            const text = response.text;
            if (!text) {
                throw new AIInvalidResponseError("AI provider returned an empty response.");
            }

            try {
                return JSON.parse(text);
            } catch {
                throw new AIInvalidResponseError("AI provider returned invalid JSON.");
            }
        } catch (error: unknown) {
            if (
                error instanceof AIConfigurationError ||
                error instanceof AIInvalidResponseError
            ) {
                throw error;
            }

            // Check for rate limiting (status 429 or RESOURCE_EXHAUSTED)
            const errStatus = (error as { status?: number })?.status;
            const errMsg = (error as Error)?.message || "";
            if (
                errStatus === 429 ||
                errMsg.includes("429") ||
                errMsg.includes("RESOURCE_EXHAUSTED") ||
                errMsg.toLowerCase().includes("quota")
            ) {
                throw new AIRateLimitedError();
            }

            // Generic provider error with sanitized message
            throw new AIProviderError(
                `AI provider request failed: ${errMsg ? sanitizeErrorMessage(errMsg) : "Unexpected error"}`
            );
        }
    }
}

function sanitizeErrorMessage(msg: string): string {
    return msg.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED]");
}

export const geminiProvider = new GeminiProvider();
