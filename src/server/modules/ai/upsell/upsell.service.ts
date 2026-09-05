import { BillingType } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import { AIService, aiService } from "@/server/modules/ai/ai.service";
import type { AIProvider } from "@/server/modules/ai/ai.types";
import { AIInvalidResponseError } from "@/server/modules/ai/ai.errors";
import {
    AIUpsellCandidate,
    AIUpsellContext,
    AIUpsellCurrentProduct,
    UpsellFit,
    UpsellRecommendationResult,
} from "./upsell.types";
import {
    upsellRecommendationJsonSchema,
    upsellRecommendationResultSchema,
} from "./upsell.validation";
import {
    buildUpsellSystemInstruction,
    buildUpsellUserPrompt,
} from "./upsell.prompt";

export interface UpsellOptions {
    mockMode?: string;
}

export class UpsellService {
    constructor(private readonly ai: AIService = aiService) {}

    /**
     * Identifies complementary product recommendations for a quotation.
     *
     * 1. Deterministically resolves candidate products from database (same org, active, sellable,
     *    valid billing configuration, not already in quotation).
     * 2. Short-circuits immediately without LLM invocation if no candidates exist.
     * 3. Calls AIService with allowlisted AIUpsellContext.
     * 4. Semantically validates all returned product IDs against the exact candidate ID set,
     *    rejecting duplicate, hallucinated, or existing products.
     *
     * Completely read-only: performs zero domain state mutations.
     */
    async getUpsellRecommendations(
        user: AuthenticatedUser,
        quotationId: string,
        options?: UpsellOptions
    ): Promise<UpsellRecommendationResult> {
        // 1. Resolve quotation & latest revision scoped to organization in database query
        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                status: true,
                customer: {
                    select: {
                        customerTier: true,
                    },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    select: {
                        subtotal: true,
                        lineDiscountTotal: true,
                        orderDiscount: true,
                        total: true,
                        marginPercent: true,
                        lines: {
                            orderBy: { lineNumber: "asc" },
                            select: {
                                productId: true,
                                name: true,
                                category: true,
                                product: {
                                    select: {
                                        billingType: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const latestRevision = quotation.revisions[0];
        if (!latestRevision) {
            throw new BadRequestError("Quotation has no revisions.");
        }

        // 2. Identify products already present in the current quotation
        const existingProductIds = new Set(
            latestRevision.lines.map((l) => l.productId)
        );

        // 3. Deterministically query eligible candidate products in same organization
        const rawCandidates = await prisma.product.findMany({
            where: {
                organizationId: user.organizationId,
                isActive: true,
                ...(existingProductIds.size > 0
                    ? { id: { notIn: Array.from(existingProductIds) } }
                    : {}),
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            select: {
                id: true,
                name: true,
                category: true,
                description: true,
                billingType: true,
                billingInterval: true,
            },
        });

        // 4. Filter for valid persisted billing configurations and project allowlisted candidates
        const candidates: AIUpsellCandidate[] = rawCandidates
            .filter((p) => {
                if (p.billingType === BillingType.RECURRING && !p.billingInterval) {
                    return false;
                }
                if (
                    p.billingType === BillingType.ONE_TIME &&
                    p.billingInterval !== null
                ) {
                    return false;
                }
                return true;
            })
            .map((p) => ({
                productId: p.id,
                name: p.name,
                category: p.category,
                description: p.description,
                billingType: p.billingType,
                billingInterval: p.billingInterval,
            }));

        // 5. Short-circuit on empty candidates: zero LLM call, instant deterministic response
        if (candidates.length === 0) {
            return {
                summary:
                    "No additional products were identified as strong matches for this deal.",
                recommendations: [],
            };
        }

        // 6. Build feature-specific AIUpsellContext
        const totalDiscount = latestRevision.lineDiscountTotal.add(
            latestRevision.orderDiscount
        );
        const blendedDiscountPercent = latestRevision.subtotal.gt(0)
            ? totalDiscount
                  .mul(100)
                  .div(latestRevision.subtotal)
                  .toDecimalPlaces(2)
                  .toNumber()
            : 0;

        const currentProducts: AIUpsellCurrentProduct[] = latestRevision.lines.map(
            (l) => ({
                name: l.name,
                category: l.category,
                billingType: l.product?.billingType ?? BillingType.ONE_TIME,
            })
        );

        const aiUpsellContext: AIUpsellContext = {
            customer: {
                tier: quotation.customer?.customerTier ?? null,
            },
            quotation: {
                status: quotation.status,
                total: latestRevision.total.toNumber(),
                marginPercent: latestRevision.marginPercent.toNumber(),
                blendedDiscountPercent,
            },
            currentProducts,
            candidates,
        };

        // 7. Format prompt
        const systemInstruction = buildUpsellSystemInstruction();
        const userPrompt = buildUpsellUserPrompt(aiUpsellContext);

        // 8. Select AI service (mockable in non-production for deterministic test verification)
        const aiToUse =
            process.env.NODE_ENV !== "production" && options?.mockMode
                ? createMockAIService(
                      options.mockMode,
                      candidates,
                      existingProductIds
                  )
                : this.ai;

        // 9. Invoke AI foundation with Zod validation
        const rawResult = await aiToUse.generateStructured({
            systemInstruction,
            userPrompt,
            schema: upsellRecommendationResultSchema,
            responseSchema: upsellRecommendationJsonSchema,
        });

        // 10. Semantic validation against authoritative candidate set
        const candidateIdSet = new Set(candidates.map((c) => c.productId));
        const seenProductIds = new Set<string>();

        for (const rec of rawResult.recommendations) {
            if (seenProductIds.has(rec.productId)) {
                throw new AIInvalidResponseError(
                    `AI returned duplicate recommendation for product ID: ${rec.productId}`
                );
            }
            seenProductIds.add(rec.productId);

            if (existingProductIds.has(rec.productId)) {
                throw new AIInvalidResponseError(
                    `AI recommended a product already present in the current quotation: ${rec.productId}`
                );
            }

            if (!candidateIdSet.has(rec.productId)) {
                throw new AIInvalidResponseError(
                    `AI returned unrecognized or unsupplied candidate product ID: ${rec.productId}`
                );
            }
        }

        return rawResult;
    }
}

function createMockAIService(
    mockMode: string,
    candidates: AIUpsellCandidate[],
    existingProductIds: Set<string>
): AIService {
    const mockProvider: AIProvider = {
        generateStructured: async () => {
            if (mockMode === "timeout") {
                await new Promise((resolve) => setTimeout(resolve, 15000));
                return {};
            }
            if (mockMode === "provider-error") {
                throw new Error(
                    "AI provider upstream error: 503 Service Unavailable"
                );
            }
            if (mockMode === "empty") {
                return {
                    summary:
                        "No additional products were identified as strong matches for this deal.",
                    recommendations: [],
                };
            }
            if (mockMode === "unknown-product") {
                return {
                    summary: "Recommended complementary enterprise server hardware.",
                    recommendations: [
                        {
                            productId: "fake-product-unknown-999",
                            fit: UpsellFit.HIGH,
                            reason: "Complementary hardware addition.",
                        },
                    ],
                };
            }
            if (mockMode === "existing-product") {
                const existingId =
                    Array.from(existingProductIds)[0] ?? "unknown-id";
                return {
                    summary: "Recommended existing line item.",
                    recommendations: [
                        {
                            productId: existingId,
                            fit: UpsellFit.HIGH,
                            reason: "Already in quote.",
                        },
                    ],
                };
            }
            if (mockMode === "excessive-recommendations") {
                return {
                    summary: "Too many recommendations.",
                    recommendations: [
                        {
                            productId: candidates[0]?.productId ?? "p1",
                            fit: UpsellFit.HIGH,
                            reason: "Option 1",
                        },
                        {
                            productId: candidates[1]?.productId ?? "p2",
                            fit: UpsellFit.HIGH,
                            reason: "Option 2",
                        },
                        {
                            productId: candidates[2]?.productId ?? "p3",
                            fit: UpsellFit.MEDIUM,
                            reason: "Option 3",
                        },
                        {
                            productId: candidates[3]?.productId ?? "p4",
                            fit: UpsellFit.LOW,
                            reason: "Option 4",
                        },
                    ],
                };
            }
            if (mockMode === "duplicate-product") {
                const targetId = candidates[0]?.productId ?? "p1";
                return {
                    summary: "Duplicate recommendation.",
                    recommendations: [
                        {
                            productId: targetId,
                            fit: UpsellFit.HIGH,
                            reason: "First mention.",
                        },
                        {
                            productId: targetId,
                            fit: UpsellFit.MEDIUM,
                            reason: "Second duplicate mention.",
                        },
                    ],
                };
            }

            // Default "valid" mode: pick up to 2 candidates
            const validRecs = candidates.slice(0, 2).map((c, idx) => ({
                productId: c.productId,
                fit: idx === 0 ? UpsellFit.HIGH : UpsellFit.MEDIUM,
                reason: `Complements deal with ${c.name} in category ${c.category}.`,
            }));

            return {
                summary:
                    "Based on the current quotation products and customer tier, these complementary items provide strong contextual value.",
                recommendations: validRecs,
            };
        },
    };

    return new AIService(mockProvider);
}

export const upsellService = new UpsellService();
