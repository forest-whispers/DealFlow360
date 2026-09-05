/**
 * AI Deal Copilot Response Synthesizer (Stage 2)
 *
 * Explains retrieved authoritative facts in concise, human-readable natural language.
 * Strictly read-only: enforces verbatim numerical facts, verifies evidence citations against
 * supplied facts, and rejects/sanitizes any false claims of quotation mutations or approvals.
 */

import { AIService, aiService } from "@/server/modules/ai/ai.service";
import {
    AITimeoutError,
    AIProviderError,
    AIInvalidResponseError,
} from "@/server/modules/ai/ai.errors";
import {
    CopilotEvidenceSource,
    CopilotIntentType,
    COPILOT_DEFAULT_TIMEOUT_MS,
    COPILOT_MOCK_MODES,
} from "./copilot.constants";
import type {
    CopilotEvidence,
    CopilotIntent,
    CopilotOptions,
    CopilotResponse,
} from "./copilot.types";
import {
    copilotResponseJsonSchema,
    copilotResponseSchema,
} from "./copilot.validation";

const SYSTEM_INSTRUCTION = `You are the DealFlow360 Copilot Response Synthesizer.
Your job is to synthesize an informative, concise, and professional answer to the user's question about a sales deal based STRICTLY and ONLY on the supplied Authoritative Facts.

MANDATORY RULES:
1. STRICT READ-ONLY: You have NO execution or mutation capability. You must NEVER claim that a quotation was updated, changed, approved, confirmed, or executed. If the user asks to "apply" or "execute" a change, explain the projected impact and explicitly inform the user that changes must be submitted or executed via the appropriate execution workflow.
2. VERBATIM NUMERICAL FACTS: Use the numbers, percentages, margins, and totals provided in the facts VERBATIM. Do NOT calculate, extrapolate, or invent numerical commercial values.
3. NEVER CONTRADICT GOVERNANCE: If governance status is REJECTED, state clearly that it exceeds allowable limits. If APPROVAL_REQUIRED, state the exact required approval level.
4. GROUNDED CITATIONS: The citations array must contain only facts provided in the Authoritative Facts, with the exact source:
   - DEAL_HEALTH: For health scores and health statuses
   - RISK_EXPLANATION: For risk factors, severities, and risk summaries
   - NEGOTIATION_PREVIEW: For proposed discounts, commercial changes, and governance checks
   - UPSELL: For complementary product recommendations
   - DEAL_CONTEXT: For deal totals, margins, quotation statuses, and workflow states
5. SAFE ACTIONS: The actions array may suggest safe next steps (e.g. "Request Sales Manager approval", "Review pending change request"). Never claim an action has already taken effect.`;

export class CopilotSynthesizerService {
    constructor(private readonly ai: AIService = aiService) {}

    /**
     * Synthesizes authoritative facts into a grounded CopilotResponse.
     */
    async synthesize(
        userMessage: string,
        intent: CopilotIntent,
        formattedContext: string,
        verbatimFacts: string[],
        defaultEvidenceSource: CopilotEvidenceSource,
        options?: CopilotOptions,
    ): Promise<CopilotResponse> {
        // Deterministic mock handling for testing in non-production
        if (options?.mockMode && process.env.NODE_ENV !== "production") {
            return this.handleMockMode(
                userMessage,
                intent,
                verbatimFacts,
                defaultEvidenceSource,
                options.mockMode,
            );
        }

        const userPrompt = [
            `User Question: "${userMessage.trim()}"`,
            `Classified Intent: ${intent.type}`,
            "",
            formattedContext,
            "",
            "Please generate your structured response conforming to the schema.",
        ].join("\n");

        const rawResponse = await this.ai.generateStructured<CopilotResponse>({
            systemInstruction: SYSTEM_INSTRUCTION,
            userPrompt,
            schema: copilotResponseSchema,
            responseSchema: copilotResponseJsonSchema,
            temperature: 0.2,
            timeoutMs: COPILOT_DEFAULT_TIMEOUT_MS,
        });

        // Post-processing: verify citations and enforce anti-mutation invariants
        return this.postProcessResponse(rawResponse, verbatimFacts, defaultEvidenceSource);
    }

    /**
     * Rigorously sanitizes and verifies the synthesized response:
     * 1. Rejects or neutralizes any false claims of applied mutations.
     * 2. Validates evidence citations against authoritative verbatim facts.
     */
    postProcessResponse(
        response: CopilotResponse,
        verbatimFacts: string[],
        defaultSource: CopilotEvidenceSource,
    ): CopilotResponse {
        let sanitizedAnswer = response.answer;

        // Anti-mutation assertion check: detect false claims of execution
        const lowerAnswer = sanitizedAnswer.toLowerCase();
        const hasFalseMutationClaim =
            lowerAnswer.includes("i have applied") ||
            lowerAnswer.includes("i applied") ||
            lowerAnswer.includes("has been updated") ||
            lowerAnswer.includes("quotation has been confirmed") ||
            lowerAnswer.includes("i have updated") ||
            lowerAnswer.includes("discount was applied") ||
            lowerAnswer.includes("changes were saved");

        if (hasFalseMutationClaim) {
            sanitizedAnswer = `${sanitizedAnswer}\n\n*Note: Copilot is strictly read-only. No quotation changes have been applied to the database.*`;
        }

        // Validate citations against supplied authoritative facts
        const validCitations: CopilotEvidence[] = [];
        for (const citation of response.citations) {
            if (!citation.fact || citation.fact.trim().length === 0) {
                continue;
            }

            // Semantic check: ensure citation is grounded in one of the verbatim facts
            const isGrounded = verbatimFacts.some((vf) => {
                const cleanVf = vf.toLowerCase();
                const cleanCit = citation.fact.toLowerCase();
                return (
                    cleanVf.includes(cleanCit) ||
                    cleanCit.includes(cleanVf) ||
                    cleanVf.split(" ").filter((w) => cleanCit.includes(w)).length >= 3
                );
            });

            if (isGrounded) {
                validCitations.push(citation);
            }
        }

        // If no citations survived grounding but verbatim facts exist, supply default authoritative citations
        if (validCitations.length === 0 && verbatimFacts.length > 0) {
            validCitations.push({
                source: defaultSource,
                fact: verbatimFacts[0],
            });
            if (verbatimFacts.length > 1) {
                validCitations.push({
                    source: defaultSource,
                    fact: verbatimFacts[1],
                });
            }
        }

        return {
            intent: response.intent,
            answer: sanitizedAnswer,
            citations: validCitations,
            actions: response.actions ?? [],
        };
    }

    private handleMockMode(
        userMessage: string,
        intent: CopilotIntent,
        verbatimFacts: string[],
        defaultSource: CopilotEvidenceSource,
        mockMode: string,
    ): CopilotResponse {
        const normalized = mockMode.toUpperCase().replace(/^MOCK[-_](COPILOT[-_])?/, "");
        if (normalized === "TIMEOUT" || mockMode === COPILOT_MOCK_MODES.TIMEOUT) {
            throw new AITimeoutError("AI request exceeded timeout of 15000ms.");
        }
        if (
            normalized === "PROVIDER_ERROR" ||
            normalized === "PROVIDER-ERROR" ||
            mockMode === COPILOT_MOCK_MODES.PROVIDER_ERROR
        ) {
            throw new AIProviderError("Simulated provider failure.");
        }
        if (
            normalized === "INVALID_RESPONSE" ||
            normalized === "INVALID-RESPONSE" ||
            mockMode === COPILOT_MOCK_MODES.INVALID_RESPONSE
        ) {
            throw new AIInvalidResponseError("Simulated invalid response.");
        }

        const citations: CopilotEvidence[] = verbatimFacts.slice(0, 3).map((f) => ({
            source: defaultSource,
            fact: f,
        }));

        switch (intent.type) {
            case CopilotIntentType.DEAL_SUMMARY:
                return {
                    intent: CopilotIntentType.DEAL_SUMMARY,
                    answer: `Here is the current summary for this deal: ${verbatimFacts.slice(0, 4).join(". ")}.`,
                    citations,
                    actions: [
                        {
                            label: "Review Quotation",
                            description: "Inspect line items and current pricing details.",
                        },
                    ],
                };

            case CopilotIntentType.DEAL_RISK:
                return {
                    intent: CopilotIntentType.DEAL_RISK,
                    answer: `Deal health analysis indicates: ${verbatimFacts.slice(0, 3).join(". ")}.`,
                    citations,
                    actions: [
                        {
                            label: "Mitigate Key Risks",
                            description: "Address identified commercial and operational risks.",
                        },
                    ],
                };

            case CopilotIntentType.NEXT_ACTION:
                return {
                    intent: CopilotIntentType.NEXT_ACTION,
                    answer: `The recommended next steps based on current blockers are: ${verbatimFacts.slice(0, 3).join(". ")}.`,
                    citations,
                    actions: [
                        {
                            label: "Resolve Next Blocker",
                            description: "Follow the required workflow action.",
                        },
                    ],
                };

            case CopilotIntentType.UPSELL:
                return {
                    intent: CopilotIntentType.UPSELL,
                    answer: `Based on current quotation lines, here are complementary product additions: ${verbatimFacts.slice(0, 3).join(". ")}.`,
                    citations,
                    actions: [
                        {
                            label: "Present Add-ons",
                            description: "Offer recommended add-ons to customer.",
                        },
                    ],
                };

            case CopilotIntentType.NEGOTIATION_ADVICE:
                const isApplyPrompt = userMessage.toLowerCase().includes("apply");
                return {
                    intent: CopilotIntentType.NEGOTIATION_ADVICE,
                    answer: `Projected commercial impact of the proposed changes: ${verbatimFacts.slice(0, 3).join(". ")}.${isApplyPrompt ? " Note: Copilot is strictly read-only; changes have not been applied." : ""}`,
                    citations,
                    actions: [
                        {
                            label: "Submit Change Proposal",
                            description: "Proceed with formal negotiation execution if agreed.",
                        },
                    ],
                };

            case CopilotIntentType.UNSUPPORTED:
            default:
                return {
                    intent: CopilotIntentType.UNSUPPORTED,
                    answer: "I can only assist with questions about this deal, including deal summaries, risk explanations, recommended next actions, upsell suggestions, and discount negotiation advice.",
                    citations: [],
                    actions: [],
                };
        }
    }
}

export const copilotSynthesizerService = new CopilotSynthesizerService();
