import { UserRole } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import { AIService, aiService } from "@/server/modules/ai/ai.service";
import type { AIProvider } from "@/server/modules/ai/ai.types";
import {
    AIInvalidResponseError,
    AIProviderError,
    AITimeoutError,
} from "@/server/modules/ai/ai.errors";
import {
    AINegotiationContext,
    AINegotiationLineContext,
    NegotiationChange,
    NegotiationChangeType,
    NegotiationInterpretationResult,
    NegotiationInterpretationStatus,
} from "./negotiation.types";
import {
    InterpretNegotiationMessageInput,
    negotiationInterpretationJsonSchema,
    negotiationInterpretationResultSchema,
} from "./negotiation.validation";
import {
    buildNegotiationSystemInstruction,
    buildNegotiationUserPrompt,
} from "./negotiation.prompt";

export interface NegotiationInterpreterOptions {
    mockMode?: string;
}

export class NegotiationInterpreterService {
    constructor(private readonly ai: AIService = aiService) {}

    /**
     * Interprets a customer's natural-language negotiation message into structured commercial intent.
     *
     * Dual authorization:
     * - CUSTOMER: strictly restricted to their own quotation (customerId === user.id) in their organization.
     * - Internal roles (SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS, ADMIN): quotations in their organization.
     * - Unauthorized or cross-org access throws NotFoundError ("Quotation not found.") preserving anti-enumeration.
     *
     * Completely read-only: performs zero domain state mutations.
     */
    async interpretMessage(
        user: AuthenticatedUser,
        quotationId: string,
        input: InterpretNegotiationMessageInput,
        options?: NegotiationInterpreterOptions
    ): Promise<NegotiationInterpretationResult> {
        // 1. Resolve quotation and latest revision with strict dual authorization in database query
        const quotationWhere: {
            id: string;
            organizationId: string;
            customerId?: string;
        } = {
            id: quotationId,
            organizationId: user.organizationId,
        };

        if (user.role === UserRole.CUSTOMER) {
            quotationWhere.customerId = user.id;
        }

        const quotation = await prisma.quotation.findFirst({
            where: quotationWhere,
            select: {
                id: true,
                quoteNumber: true,
                status: true,
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    select: {
                        revisionNumber: true,
                        lines: {
                            orderBy: { lineNumber: "asc" },
                            select: {
                                lineNumber: true,
                                name: true,
                                sku: true,
                                category: true,
                                quantity: true,
                                unitPrice: true,
                                discountPercent: true,
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

        // 2. Build allowlisted AINegotiationContext
        // Strips all internal database IDs, costs, margins, and PII.
        const linesContext: AINegotiationLineContext[] = latestRevision.lines.map(
            (line) => ({
                lineNumber: line.lineNumber,
                name: line.name,
                sku: line.sku,
                category: line.category,
                quantity: line.quantity,
                currentDiscountPercent: line.discountPercent.toNumber(),
                unitPrice: line.unitPrice.toNumber(),
            })
        );

        const aiNegotiationContext: AINegotiationContext = {
            quotation: {
                quoteNumber: quotation.quoteNumber,
                revisionNumber: latestRevision.revisionNumber,
            },
            lines: linesContext,
            customerMessage: input.message.trim(),
        };

        // 3. Format prompt
        const systemInstruction = buildNegotiationSystemInstruction();
        const userPrompt = buildNegotiationUserPrompt(aiNegotiationContext);

        // 4. Select AI service (mockable in non-production for deterministic test verification)
        const aiToUse =
            process.env.NODE_ENV !== "production" && options?.mockMode
                ? createMockAIService(options.mockMode, aiNegotiationContext)
                : this.ai;

        // 5. Invoke AI foundation with application-level Zod validation
        const rawResult = await aiToUse.generateStructured({
            systemInstruction,
            userPrompt,
            schema: negotiationInterpretationResultSchema,
            responseSchema: negotiationInterpretationJsonSchema,
        });

        // 6. Post-processing Semantic Grounding & Boundary Validations
        if (
            rawResult.status === NegotiationInterpretationStatus.AMBIGUOUS ||
            rawResult.status === NegotiationInterpretationStatus.UNSUPPORTED
        ) {
            return {
                status: rawResult.status,
                intent: null,
            };
        }

        // status === "INTERPRETED"
        if (!rawResult.intent || !rawResult.intent.changes || rawResult.intent.changes.length === 0) {
            throw new AIInvalidResponseError(
                "INTERPRETED status must include at least one valid change in intent."
            );
        }

        const lineMap = new Map<number, AINegotiationLineContext>();
        for (const line of linesContext) {
            lineMap.set(line.lineNumber, line);
        }

        const seenChangeKeys = new Set<string>();
        const normalizedChanges: NegotiationChange[] = [];

        for (const change of rawResult.intent.changes) {
            // Grounding check: line number must exist on the current quotation revision
            if (!lineMap.has(change.lineNumber)) {
                throw new AIInvalidResponseError(
                    `Referenced quotation line #${change.lineNumber} does not exist on this quotation revision.`
                );
            }

            // Conflict / Duplicate check:
            // A LINE_DISCOUNT and a LINE_QUANTITY on the same line are allowed together.
            // Duplicate changes of the SAME type on the same line are conflicting/duplicate.
            const compositeKey = `${change.type}:${change.lineNumber}`;
            if (seenChangeKeys.has(compositeKey)) {
                throw new AIInvalidResponseError(
                    `Conflicting or duplicate ${change.type} change targeting line #${change.lineNumber}.`
                );
            }
            seenChangeKeys.add(compositeKey);

            // Numeric bounds normalization
            if (change.type === NegotiationChangeType.LINE_DISCOUNT) {
                const discountPercent = Number(change.discountPercent);
                if (
                    !Number.isFinite(discountPercent) ||
                    discountPercent < 0 ||
                    discountPercent > 100
                ) {
                    throw new AIInvalidResponseError(
                        `Invalid discount percent ${discountPercent} on line #${change.lineNumber}. Must be between 0 and 100.`
                    );
                }
                normalizedChanges.push({
                    type: NegotiationChangeType.LINE_DISCOUNT,
                    lineNumber: change.lineNumber,
                    discountPercent,
                });
            } else if (change.type === NegotiationChangeType.LINE_QUANTITY) {
                const quantity = Number(change.quantity);
                if (!Number.isInteger(quantity) || quantity < 1) {
                    throw new AIInvalidResponseError(
                        `Invalid quantity ${quantity} on line #${change.lineNumber}. Must be a positive integer >= 1.`
                    );
                }
                normalizedChanges.push({
                    type: NegotiationChangeType.LINE_QUANTITY,
                    lineNumber: change.lineNumber,
                    quantity,
                });
            } else {
                throw new AIInvalidResponseError(
                    `Unsupported change type '${(change as unknown as { type: string }).type}'.`
                );
            }
        }

        // Deterministic Ordering: lineNumber ASC, then type ASC
        normalizedChanges.sort((a, b) => {
            if (a.lineNumber !== b.lineNumber) {
                return a.lineNumber - b.lineNumber;
            }
            return a.type.localeCompare(b.type);
        });

        return {
            status: NegotiationInterpretationStatus.INTERPRETED,
            intent: {
                changes: normalizedChanges,
            },
        };
    }
}

/**
 * Creates a mock AIService for deterministic non-production testing.
 * Completely bypassed in production environments.
 */
function createMockAIService(
    mode: string,
    context: AINegotiationContext
): AIService {
    const mockProvider: AIProvider = {
        async generateStructured<T>(): Promise<T> {
            switch (mode) {
                case "discount-18":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 18,
                                },
                            ],
                        },
                    } as T;

                case "quantity-20":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_QUANTITY,
                                    lineNumber: 1,
                                    quantity: 20,
                                },
                            ],
                        },
                    } as T;

                case "discount-and-quantity":
                    // Returns in reversed order to verify deterministic sorting
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_QUANTITY,
                                    lineNumber: 1,
                                    quantity: 20,
                                },
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 10,
                                },
                            ],
                        },
                    } as T;

                case "same-line-both":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 25,
                                },
                                {
                                    type: NegotiationChangeType.LINE_QUANTITY,
                                    lineNumber: 1,
                                    quantity: 15,
                                },
                            ],
                        },
                    } as T;

                case "50-percent-discount":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 50,
                                },
                            ],
                        },
                    } as T;

                case "ambiguous":
                    return {
                        status: NegotiationInterpretationStatus.AMBIGUOUS,
                        intent: null,
                    } as T;

                case "unsupported":
                case "prompt-injection":
                    return {
                        status: NegotiationInterpretationStatus.UNSUPPORTED,
                        intent: null,
                    } as T;

                case "unknown-line":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 999,
                                    discountPercent: 15,
                                },
                            ],
                        },
                    } as T;

                case "conflicting-changes":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 10,
                                },
                                {
                                    type: NegotiationChangeType.LINE_DISCOUNT,
                                    lineNumber: 1,
                                    discountPercent: 20,
                                },
                            ],
                        },
                    } as T;

                case "invalid-type":
                    return {
                        status: NegotiationInterpretationStatus.INTERPRETED,
                        intent: {
                            changes: [
                                {
                                    type: "INVALID_CHANGE_TYPE",
                                    lineNumber: 1,
                                },
                            ],
                        },
                    } as T;

                case "timeout":
                    throw new AITimeoutError("AI generation timed out after 30000ms.");

                case "provider-error":
                    throw new AIProviderError("Gemini API service temporarily unavailable.");

                default:
                    // Auto-mode based on message inspection for smart mock scenarios
                    const lowerMsg = context.customerMessage.toLowerCase();
                    if (
                        lowerMsg.includes("net-60") ||
                        lowerMsg.includes("net 60") ||
                        lowerMsg.includes("payment term") ||
                        lowerMsg.includes("shipping")
                    ) {
                        return {
                            status: NegotiationInterpretationStatus.UNSUPPORTED,
                            intent: null,
                        } as T;
                    }
                    if (
                        lowerMsg.includes("ignore") ||
                        lowerMsg.includes("prompt") ||
                        lowerMsg.includes("system")
                    ) {
                        return {
                            status: NegotiationInterpretationStatus.UNSUPPORTED,
                            intent: null,
                        } as T;
                    }
                    if (
                        lowerMsg.includes("laptops") &&
                        context.lines.filter((l) =>
                            l.name.toLowerCase().includes("laptop")
                        ).length > 1
                    ) {
                        return {
                            status: NegotiationInterpretationStatus.AMBIGUOUS,
                            intent: null,
                        } as T;
                    }
                    if (lowerMsg.includes("18%")) {
                        return {
                            status: NegotiationInterpretationStatus.INTERPRETED,
                            intent: {
                                changes: [
                                    {
                                        type: NegotiationChangeType.LINE_DISCOUNT,
                                        lineNumber: 1,
                                        discountPercent: 18,
                                    },
                                ],
                            },
                        } as T;
                    }
                    if (lowerMsg.includes("20") && lowerMsg.includes("10%")) {
                        return {
                            status: NegotiationInterpretationStatus.INTERPRETED,
                            intent: {
                                changes: [
                                    {
                                        type: NegotiationChangeType.LINE_QUANTITY,
                                        lineNumber: 1,
                                        quantity: 20,
                                    },
                                    {
                                        type: NegotiationChangeType.LINE_DISCOUNT,
                                        lineNumber: 1,
                                        discountPercent: 10,
                                    },
                                ],
                            },
                        } as T;
                    }
                    return {
                        status: NegotiationInterpretationStatus.AMBIGUOUS,
                        intent: null,
                    } as T;
            }
        },
    };

    return new AIService(mockProvider);
}

export const negotiationInterpreterService = new NegotiationInterpreterService();
