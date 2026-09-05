import { AIProvider, GenerateStructuredOptions } from "./ai.types";
import { geminiProvider } from "./providers/gemini.provider";
import { AI_DEFAULT_TIMEOUT_MS } from "./ai.constants";
import {
    AIError,
    AIInvalidResponseError,
    AIProviderError,
    AITimeoutError,
} from "./ai.errors";

export class AIService {
    constructor(private readonly provider: AIProvider = geminiProvider) {}

    /**
     * Executes a structured AI request against the configured provider with bounded timeout
     * and strict application-level Zod schema validation.
     *
     * TIMEOUT SEMANTICS:
     * Promise.race bounds application-level execution to throw an AITimeoutError if the provider
     * does not resolve within the specified timeout duration. This guarantees responsive failure
     * boundaries for callers, but does not abort the underlying network connection if the SDK/provider
     * does not support AbortSignal.
     */
    async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
        const timeoutMs = options.timeoutMs ?? AI_DEFAULT_TIMEOUT_MS;

        let timerId: NodeJS.Timeout | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timerId = setTimeout(() => {
                reject(new AITimeoutError(`AI request exceeded timeout of ${timeoutMs}ms.`));
            }, timeoutMs);
        });

        try {
            const rawResult = await Promise.race([
                this.provider.generateStructured({
                    systemInstruction: options.systemInstruction,
                    userPrompt: options.userPrompt,
                    responseSchema: options.responseSchema,
                    temperature: options.temperature,
                }),
                timeoutPromise,
            ]);

            // Clear the timeout timer immediately upon successful resolution
            if (timerId) clearTimeout(timerId);

            // Authoritative application-side Zod validation
            const parseResult = options.schema.safeParse(rawResult);
            if (!parseResult.success) {
                throw new AIInvalidResponseError(
                    `AI response failed schema validation: ${parseResult.error.issues
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join(", ")}`
                );
            }

            return parseResult.data;
        } catch (error: unknown) {
            if (timerId) clearTimeout(timerId);

            if (error instanceof AIError) {
                throw error;
            }

            throw new AIProviderError(
                error instanceof Error ? error.message : "AI service execution failed."
            );
        }
    }
}

export const aiService = new AIService();
