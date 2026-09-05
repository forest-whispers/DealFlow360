import {
    DiscountApprovalPolicy,
    DiscountCategoryRule,
    DiscountTierRule,
    Prisma,
} from "@prisma/client";

import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { evaluateLineDiscount } from "./discount-calculator";
import type {
    CanonicalLineEvaluationResult,
    CreateCategoryRuleInput,
    CreateTierRuleInput,
    DiscountApprovalPolicyResponse,
    DiscountCategoryRuleResponse,
    DiscountLineContext,
    DiscountRuleArchiveResponse,
    DiscountTierRuleResponse,
    EvaluateLineInput,
    ListRulesQuery,
    NormalizedDiscountGovernanceRules,
    UpdateApprovalPolicyInput,
    UpdateCategoryRuleInput,
    UpdateTierRuleInput,
} from "./discount-governance.types";

export function mapTierRuleToResponse(
    record: DiscountTierRule,
): DiscountTierRuleResponse {
    return {
        id: record.id,
        customerTier: record.customerTier,
        maximumDiscountPercent: record.maximumDiscountPercent.toNumber(),
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function mapCategoryRuleToResponse(
    record: DiscountCategoryRule,
): DiscountCategoryRuleResponse {
    return {
        id: record.id,
        category: record.category,
        maximumDiscountPercent: record.maximumDiscountPercent.toNumber(),
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export function mapApprovalPolicyToResponse(
    record: DiscountApprovalPolicy,
): DiscountApprovalPolicyResponse {
    return {
        id: record.id,
        salesManagerThreshold: record.salesManagerThreshold.toNumber(),
        financeOperationsThreshold: record.financeOperationsThreshold.toNumber(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class DiscountGovernanceService {
    // ==========================================
    // Customer Tier Rules CRUD
    // ==========================================

    async listTierRules(
        user: AuthenticatedUser,
        query?: ListRulesQuery,
    ): Promise<DiscountTierRuleResponse[]> {
        const where: Prisma.DiscountTierRuleWhereInput = {
            organizationId: user.organizationId,
        };

        if (query?.isActive !== undefined) {
            where.isActive = query.isActive;
        }

        const rules = await prisma.discountTierRule.findMany({
            where,
            orderBy: {
                createdAt: "asc",
            },
        });

        return rules.map(mapTierRuleToResponse);
    }

    async getTierRuleById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<DiscountTierRuleResponse> {
        const rule = await prisma.discountTierRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount tier rule not found.");
        }

        return mapTierRuleToResponse(rule);
    }

    async createTierRule(
        user: AuthenticatedUser,
        input: CreateTierRuleInput,
    ): Promise<DiscountTierRuleResponse> {
        const existing = await prisma.discountTierRule.findUnique({
            where: {
                organizationId_customerTier: {
                    organizationId: user.organizationId,
                    customerTier: input.customerTier,
                },
            },
        });

        if (existing) {
            if (existing.isActive) {
                throw new ConflictError(
                    `A discount rule for customer tier ${input.customerTier} already exists.`,
                );
            }

            // Reactivate previously soft-deleted rule and update percentage
            const reactivated = await prisma.discountTierRule.update({
                where: { id: existing.id },
                data: {
                    maximumDiscountPercent: new Prisma.Decimal(
                        input.maximumDiscountPercent,
                    ),
                    isActive: true,
                },
            });

            return mapTierRuleToResponse(reactivated);
        }

        const rule = await prisma.discountTierRule.create({
            data: {
                organizationId: user.organizationId,
                customerTier: input.customerTier,
                maximumDiscountPercent: new Prisma.Decimal(
                    input.maximumDiscountPercent,
                ),
                isActive: true,
            },
        });

        return mapTierRuleToResponse(rule);
    }

    async updateTierRule(
        user: AuthenticatedUser,
        id: string,
        input: UpdateTierRuleInput,
    ): Promise<DiscountTierRuleResponse> {
        const rule = await prisma.discountTierRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount tier rule not found.");
        }

        const data: Prisma.DiscountTierRuleUpdateInput = {};
        if (input.maximumDiscountPercent !== undefined) {
            data.maximumDiscountPercent = new Prisma.Decimal(
                input.maximumDiscountPercent,
            );
        }
        if (input.isActive !== undefined) {
            data.isActive = input.isActive;
        }

        const updated = await prisma.discountTierRule.update({
            where: { id: rule.id },
            data,
        });

        return mapTierRuleToResponse(updated);
    }

    async archiveTierRule(
        user: AuthenticatedUser,
        id: string,
    ): Promise<DiscountRuleArchiveResponse> {
        const rule = await prisma.discountTierRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount tier rule not found.");
        }

        if (rule.isActive) {
            await prisma.discountTierRule.update({
                where: { id: rule.id },
                data: { isActive: false },
            });
        }

        return {
            message: "Discount tier rule archived successfully.",
        };
    }

    // ==========================================
    // Product Category Rules CRUD
    // ==========================================

    async listCategoryRules(
        user: AuthenticatedUser,
        query?: ListRulesQuery,
    ): Promise<DiscountCategoryRuleResponse[]> {
        const where: Prisma.DiscountCategoryRuleWhereInput = {
            organizationId: user.organizationId,
        };

        if (query?.isActive !== undefined) {
            where.isActive = query.isActive;
        }

        const rules = await prisma.discountCategoryRule.findMany({
            where,
            orderBy: {
                category: "asc",
            },
        });

        return rules.map(mapCategoryRuleToResponse);
    }

    async getCategoryRuleById(
        user: AuthenticatedUser,
        id: string,
    ): Promise<DiscountCategoryRuleResponse> {
        const rule = await prisma.discountCategoryRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount category rule not found.");
        }

        return mapCategoryRuleToResponse(rule);
    }

    async createCategoryRule(
        user: AuthenticatedUser,
        input: CreateCategoryRuleInput,
    ): Promise<DiscountCategoryRuleResponse> {
        const category = input.category.trim();

        const existing = await prisma.discountCategoryRule.findUnique({
            where: {
                organizationId_category: {
                    organizationId: user.organizationId,
                    category,
                },
            },
        });

        if (existing) {
            if (existing.isActive) {
                throw new ConflictError(
                    `A discount rule for category "${category}" already exists.`,
                );
            }

            // Reactivate previously soft-deleted rule and update percentage
            const reactivated = await prisma.discountCategoryRule.update({
                where: { id: existing.id },
                data: {
                    maximumDiscountPercent: new Prisma.Decimal(
                        input.maximumDiscountPercent,
                    ),
                    isActive: true,
                },
            });

            return mapCategoryRuleToResponse(reactivated);
        }

        const rule = await prisma.discountCategoryRule.create({
            data: {
                organizationId: user.organizationId,
                category,
                maximumDiscountPercent: new Prisma.Decimal(
                    input.maximumDiscountPercent,
                ),
                isActive: true,
            },
        });

        return mapCategoryRuleToResponse(rule);
    }

    async updateCategoryRule(
        user: AuthenticatedUser,
        id: string,
        input: UpdateCategoryRuleInput,
    ): Promise<DiscountCategoryRuleResponse> {
        const rule = await prisma.discountCategoryRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount category rule not found.");
        }

        const data: Prisma.DiscountCategoryRuleUpdateInput = {};
        if (input.maximumDiscountPercent !== undefined) {
            data.maximumDiscountPercent = new Prisma.Decimal(
                input.maximumDiscountPercent,
            );
        }
        if (input.isActive !== undefined) {
            data.isActive = input.isActive;
        }

        const updated = await prisma.discountCategoryRule.update({
            where: { id: rule.id },
            data,
        });

        return mapCategoryRuleToResponse(updated);
    }

    async archiveCategoryRule(
        user: AuthenticatedUser,
        id: string,
    ): Promise<DiscountRuleArchiveResponse> {
        const rule = await prisma.discountCategoryRule.findFirst({
            where: {
                id,
                organizationId: user.organizationId,
            },
        });

        if (!rule) {
            throw new NotFoundError("Discount category rule not found.");
        }

        if (rule.isActive) {
            await prisma.discountCategoryRule.update({
                where: { id: rule.id },
                data: { isActive: false },
            });
        }

        return {
            message: "Discount category rule archived successfully.",
        };
    }

    // ==========================================
    // Approval Policy CRUD
    // ==========================================

    async getApprovalPolicy(
        user: AuthenticatedUser,
    ): Promise<DiscountApprovalPolicyResponse> {
        const policy = await prisma.discountApprovalPolicy.findUnique({
            where: {
                organizationId: user.organizationId,
            },
        });

        if (!policy) {
            throw new NotFoundError(
                "Discount approval policy not configured for this organization.",
            );
        }

        return mapApprovalPolicyToResponse(policy);
    }

    async updateApprovalPolicy(
        user: AuthenticatedUser,
        input: UpdateApprovalPolicyInput,
    ): Promise<DiscountApprovalPolicyResponse> {
        const policy = await prisma.discountApprovalPolicy.upsert({
            where: {
                organizationId: user.organizationId,
            },
            create: {
                organizationId: user.organizationId,
                salesManagerThreshold: new Prisma.Decimal(
                    input.salesManagerThreshold,
                ),
                financeOperationsThreshold: new Prisma.Decimal(
                    input.financeOperationsThreshold,
                ),
            },
            update: {
                salesManagerThreshold: new Prisma.Decimal(
                    input.salesManagerThreshold,
                ),
                financeOperationsThreshold: new Prisma.Decimal(
                    input.financeOperationsThreshold,
                ),
            },
        });

        return mapApprovalPolicyToResponse(policy);
    }

    // ==========================================
    // Live Quotation Line Evaluation
    // ==========================================

    async evaluateLine(
        user: AuthenticatedUser,
        input: EvaluateLineInput,
    ): Promise<CanonicalLineEvaluationResult> {
        // 1. Resolve product and verify tenant ownership & active status
        const product = await prisma.product.findFirst({
            where: {
                id: input.line.productId,
                organizationId: user.organizationId,
                isActive: true,
            },
        });

        if (!product) {
            throw new NotFoundError("Product not found or inactive.");
        }

        // 2. If variant is provided, verify it belongs to this product, tenant, and is active
        if (input.line.variantId) {
            const variant = await prisma.productVariant.findFirst({
                where: {
                    id: input.line.variantId,
                    productId: product.id,
                    organizationId: user.organizationId,
                    isActive: true,
                },
            });

            if (!variant) {
                throw new NotFoundError("Product variant not found or inactive.");
            }
        }

        // 3. Fetch active tier rule for customerTier
        const tierRule = await prisma.discountTierRule.findFirst({
            where: {
                organizationId: user.organizationId,
                customerTier: input.customerTier,
                isActive: true,
            },
        });

        // 4. Fetch active category rule for product.category
        const categoryRule = await prisma.discountCategoryRule.findFirst({
            where: {
                organizationId: user.organizationId,
                category: product.category,
                isActive: true,
            },
        });

        // 5. Fetch approval policy for organization
        const policy = await prisma.discountApprovalPolicy.findUnique({
            where: {
                organizationId: user.organizationId,
            },
        });

        if (!policy) {
            throw new BadRequestError(
                "Discount approval policy is not configured for this organization.",
            );
        }

        // 6. Ensure at least one rule exists for ceiling determination
        if (!tierRule && !categoryRule) {
            throw new BadRequestError(
                "No discount governance rules configured for this customer tier or product category.",
            );
        }

        // 7. Normalize rules for pure calculator
        const normalizedRules: NormalizedDiscountGovernanceRules = {
            customerTierLimit: tierRule
                ? tierRule.maximumDiscountPercent.toNumber()
                : null,
            categoryLimit: categoryRule
                ? categoryRule.maximumDiscountPercent.toNumber()
                : null,
            salesManagerThreshold: policy.salesManagerThreshold.toNumber(),
            financeOperationsThreshold:
                policy.financeOperationsThreshold.toNumber(),
        };

        const context: DiscountLineContext = {
            lineId: input.line.lineId,
            customerTier: input.customerTier,
            productCategory: product.category,
            discountPercent: input.line.discountPercent,
        };

        return evaluateLineDiscount(context, normalizedRules);
    }
}

export const discountGovernanceService = new DiscountGovernanceService();
