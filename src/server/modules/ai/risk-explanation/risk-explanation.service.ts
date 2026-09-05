import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { dealIntelligenceService } from "@/server/modules/deal-intelligence/deal-intelligence.service";
import {
    DealHealthStatus,
    DealRiskFactor,
    DealRiskFactorType,
    DealRiskSeverity,
} from "@/server/modules/deal-intelligence/deal-intelligence.types";
import { AIService, aiService } from "@/server/modules/ai/ai.service";
import { AIProvider } from "@/server/modules/ai/ai.types";
import { buildAIDealContext, formatDealContextForPrompt } from "@/server/modules/ai/ai.context";
import { AIInvalidResponseError } from "@/server/modules/ai/ai.errors";
import { DealRiskExplanation } from "./risk-explanation.types";
import {
    dealRiskExplanationJsonSchema,
    dealRiskExplanationSchema,
} from "./risk-explanation.validation";
import {
    buildRiskExplanationSystemInstruction,
    buildRiskExplanationUserPrompt,
} from "./risk-explanation.prompt";

const SEVERITY_WEIGHT: Record<DealRiskSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

export interface RiskExplanationOptions {
    mockMode?: string;
}

export class RiskExplanationService {
    constructor(private readonly ai: AIService = aiService) {}

    /**
     * Gathers authoritative deal intelligence, generates a structured AI risk explanation,
     * and rigorously post-validates that the LLM has not hallucinated or altered risk factors or severities.
     *
     * Completely read-only: performs zero domain state mutations.
     */
    async getRiskExplanation(
        user: AuthenticatedUser,
        quotationId: string,
        options?: RiskExplanationOptions
    ): Promise<DealRiskExplanation> {
        // 1. Authoritative deal intelligence gathered in a single database read path
        const { context: dealContext, health: healthResult } =
            await dealIntelligenceService.getDealIntelligence(user, quotationId);

        // 2. Deterministic sorting: higher-severity and higher-impact factors first
        const sortedFactors: DealRiskFactor[] = [...healthResult.factors].sort((a, b) => {
            const severityDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
            return severityDiff !== 0 ? severityDiff : b.impact - a.impact;
        });

        // 3. Construct allowlisted AI context & format for prompt
        const aiDealContext = buildAIDealContext(dealContext, {
            ...healthResult,
            factors: sortedFactors,
        });
        const formattedContext = formatDealContextForPrompt(aiDealContext);

        // 4. Build prompt grounded strictly in authoritative facts
        const systemInstruction = buildRiskExplanationSystemInstruction();
        const userPrompt = buildRiskExplanationUserPrompt(
            formattedContext,
            healthResult.status,
            healthResult.score,
            sortedFactors
        );

        // 5. Select AI service (mockable in non-production environments for reliable testing)
        const aiToUse =
            process.env.NODE_ENV !== "production" && options?.mockMode
                ? createMockAIService(options.mockMode)
                : this.ai;

        // 6. Invoke AI foundation with Zod validation
        const rawResult = await aiToUse.generateStructured({
            systemInstruction,
            userPrompt,
            schema: dealRiskExplanationSchema,
            responseSchema: dealRiskExplanationJsonSchema,
        });

        // 7. Post-processing Grounding & Invariant Validations
        const isHealthy = healthResult.status === DealHealthStatus.HEALTHY;

        // Invariant A: Healthy deals must have zero key risks
        if (isHealthy && rawResult.keyRisks.length > 0) {
            throw new AIInvalidResponseError("Healthy deal cannot have key risks.");
        }

        // Invariant B: Factor grounding, severity consistency, and no duplicate factor entries
        const authoritativeFactorMap = new Map<DealRiskFactorType, DealRiskSeverity>();
        for (const factor of healthResult.factors) {
            authoritativeFactorMap.set(factor.type, factor.severity);
        }

        const seenFactors = new Set<DealRiskFactorType>();
        for (const risk of rawResult.keyRisks) {
            if (!authoritativeFactorMap.has(risk.factor)) {
                throw new AIInvalidResponseError(
                    `AI returned unrecognized or unsupplied risk factor: ${risk.factor}`
                );
            }

            if (seenFactors.has(risk.factor)) {
                throw new AIInvalidResponseError(
                    `AI returned duplicate key risk for factor: ${risk.factor}`
                );
            }
            seenFactors.add(risk.factor);

            const expectedSeverity = authoritativeFactorMap.get(risk.factor);
            if (risk.severity !== expectedSeverity) {
                throw new AIInvalidResponseError(
                    `AI returned inconsistent severity for factor ${risk.factor}: expected ${expectedSeverity}, got ${risk.severity}`
                );
            }
        }

        // Invariant C: Recommended action priorities must be strictly sequential starting at 1
        for (let i = 0; i < rawResult.recommendedActions.length; i++) {
            const action = rawResult.recommendedActions[i];
            const expectedPriority = i + 1;
            if (action.priority !== expectedPriority) {
                throw new AIInvalidResponseError(
                    `Recommended action priorities must be strictly sequential starting at 1. Expected ${expectedPriority}, got ${action.priority}`
                );
            }
        }

        return rawResult;
    }
}

function createMockAIService(mockMode: string): AIService {
    const mockProvider: AIProvider = {
        generateStructured: async () => {
            if (mockMode === "timeout") {
                await new Promise((resolve) => setTimeout(resolve, 15000));
                return {};
            }
            if (mockMode === "provider-error") {
                throw new Error("AI provider upstream error: 503 Service Unavailable");
            }
            if (mockMode === "healthy") {
                return {
                    summary: "This quotation is healthy with strong 40% margins and standard commercial terms.",
                    keyRisks: [],
                    recommendedActions: [
                        {
                            priority: 1,
                            action: "Submit quotation to customer.",
                            reason: "Deal meets all governance thresholds.",
                        },
                    ],
                };
            }
            if (mockMode === "single-risk") {
                return {
                    summary: "The quotation has compressed profitability with a 5% margin.",
                    keyRisks: [
                        {
                            factor: DealRiskFactorType.MARGIN,
                            severity: DealRiskSeverity.CRITICAL,
                            explanation: "Thin 5% margin is significantly below the target margin threshold.",
                        },
                    ],
                    recommendedActions: [
                        {
                            priority: 1,
                            action: "Review line-item discounting with sales management.",
                            reason: "Restore margin to at least 15%.",
                        },
                    ],
                };
            }
            if (mockMode === "multi-risk") {
                return {
                    summary: "The quotation requires Finance approval and has warehouse stock shortage.",
                    keyRisks: [
                        {
                            factor: DealRiskFactorType.DISCOUNT,
                            severity: DealRiskSeverity.HIGH,
                            explanation: "The requested discount exceeds standard limits and requires Finance Operations approval.",
                        },
                        {
                            factor: DealRiskFactorType.FULFILLMENT,
                            severity: DealRiskSeverity.HIGH,
                            explanation: "Primary warehouse currently has zero stock available for this line item.",
                        },
                    ],
                    recommendedActions: [
                        {
                            priority: 1,
                            action: "Submit discount justification to Finance Operations.",
                            reason: "Required to clear the approval gate.",
                        },
                        {
                            priority: 2,
                            action: "Check inventory availability across alternative warehouses.",
                            reason: "Resolve allocation shortage before confirmation.",
                        },
                    ],
                };
            }
            throw new Error(`Unknown mock mode: ${mockMode}`);
        },
    };
    return new AIService(mockProvider);
}

export const riskExplanationService = new RiskExplanationService();
