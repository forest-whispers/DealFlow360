import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    ApprovalStepStatus,
    CustomerTier,
    Prisma,
    QuotationRevisionStatus,
    QuotationStatus,
    UserRole,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { evaluateLineDiscount } from "@/server/modules/discount-governance/discount-calculator";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type {
    CanonicalLineEvaluationResult,
    DiscountLineContext,
    NormalizedDiscountGovernanceRules,
} from "@/server/modules/discount-governance/discount-governance.types";
import {
    calculateLineCommercials,
    calculateQuotationSummary,
    evaluateQuotationGovernance,
    roundToTwo,
} from "./quotation.calculation";
import type {
    CanonicalQuotationResponse,
    CreateQuotationInput,
    DraftLineInput,
    LinePreviewInput,
    LinePreviewResponse,
    ListQuotationsQuery,
    QuotationCardResponse,
    QuotationLineResponse,
    QuotationListResponse,
    RecalculateLineInput,
    RecalculateLineResponse,
    SaveDraftInput,
    SubmitQuotationResponse,
} from "./quotation.types";

export class QuotationService {
    // ==========================================
    // Internal Helper: Resolve Products & Variants (Batch)
    // ==========================================
    private async resolveProductsAndVariants(
        organizationId: string,
        items: { productId: string; variantId?: string | null }[],
    ) {
        const productIds = Array.from(new Set(items.map((i) => i.productId)));
        const variantIds = Array.from(
            new Set(
                items
                    .filter((i) => i.variantId)
                    .map((i) => i.variantId as string),
            ),
        );

        const [products, variants] = await Promise.all([
            prisma.product.findMany({
                where: {
                    id: { in: productIds },
                    organizationId,
                    isActive: true,
                },
            }),
            variantIds.length > 0
                ? prisma.productVariant.findMany({
                      where: {
                          id: { in: variantIds },
                          organizationId,
                          isActive: true,
                      },
                  })
                : [],
        ]);

        const productMap = new Map(products.map((p) => [p.id, p]));
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        return { productMap, variantMap };
    }

    // ==========================================
    // Internal Helper: Resolve Governance Rules (Batch)
    // ==========================================
    private async resolveGovernanceRules(
        organizationId: string,
        customerTier: CustomerTier | null,
        categories: string[],
    ) {
        const uniqueCategories = Array.from(new Set(categories));

        const [tierRule, categoryRules, approvalPolicy] = await Promise.all([
            customerTier
                ? prisma.discountTierRule.findFirst({
                      where: {
                          organizationId,
                          customerTier,
                          isActive: true,
                      },
                  })
                : null,
            prisma.discountCategoryRule.findMany({
                where: {
                    organizationId,
                    category: { in: uniqueCategories },
                    isActive: true,
                },
            }),
            prisma.discountApprovalPolicy.findUnique({
                where: {
                    organizationId,
                },
            }),
        ]);

        if (!approvalPolicy) {
            throw new BadRequestError(
                "Discount approval policy is not configured for this organization.",
            );
        }

        const categoryRuleMap = new Map(
            categoryRules.map((r) => [
                r.category,
                r.maximumDiscountPercent.toNumber(),
            ]),
        );

        return {
            customerTierLimit: tierRule
                ? tierRule.maximumDiscountPercent.toNumber()
                : null,
            categoryRuleMap,
            salesManagerThreshold: approvalPolicy.salesManagerThreshold.toNumber(),
            financeOperationsThreshold:
                approvalPolicy.financeOperationsThreshold.toNumber(),
        };
    }

    // ==========================================
    // Internal Helper: Generate Quote Number
    // ==========================================
    private async generateQuoteNumber(
        tx: Prisma.TransactionClient,
        organizationId: string,
    ): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `Q-${currentYear}-`;

        const lastQuote = await tx.quotation.findFirst({
            where: {
                organizationId,
                quoteNumber: { startsWith: prefix },
            },
            orderBy: { quoteNumber: "desc" },
            select: { quoteNumber: true },
        });

        let nextSeq = 1;
        if (lastQuote) {
            const parts = lastQuote.quoteNumber.split("-");
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
                nextSeq = num + 1;
            }
        }

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    // ==========================================
    // 1. Create Quotation
    // ==========================================
    async createQuotation(
        user: AuthenticatedUser,
        input: CreateQuotationInput,
    ): Promise<CanonicalQuotationResponse> {
        // Validate customer
        const customer = await prisma.user.findFirst({
            where: {
                id: input.customerId,
                organizationId: user.organizationId,
                role: UserRole.CUSTOMER,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                customerTier: true,
            },
        });

        if (!customer) {
            throw new NotFoundError("Customer not found or inactive.");
        }

        // Transactionally create Quotation and Revision 1
        const result = await prisma.$transaction(async (tx) => {
            const quoteNumber = await this.generateQuoteNumber(
                tx,
                user.organizationId,
            );

            const quotation = await tx.quotation.create({
                data: {
                    quoteNumber,
                    status: QuotationStatus.DRAFT,
                    customerId: customer.id,
                    organizationId: user.organizationId,
                },
            });

            const revision = await tx.quotationRevision.create({
                data: {
                    quotationId: quotation.id,
                    revisionNumber: 1,
                    status: QuotationRevisionStatus.DRAFT,
                    orderDiscountPercent: new Prisma.Decimal(0),
                    subtotal: new Prisma.Decimal(0),
                    lineDiscountTotal: new Prisma.Decimal(0),
                    orderDiscount: new Prisma.Decimal(0),
                    total: new Prisma.Decimal(0),
                    margin: new Prisma.Decimal(0),
                    marginPercent: new Prisma.Decimal(0),
                },
            });

            return { quotation, revision };
        });

        return {
            id: result.quotation.id,
            quoteNumber: result.quotation.quoteNumber,
            customer: {
                id: customer.id,
                name: customer.name,
                customerTier: customer.customerTier,
            },
            status: QuotationStatus.DRAFT,
            revision: {
                id: result.revision.id,
                revisionNumber: 1,
                status: QuotationRevisionStatus.DRAFT,
                lines: [],
                orderDiscountPercent: 0,
                summary: {
                    subtotal: 0,
                    lineDiscountTotal: 0,
                    orderDiscount: 0,
                    total: 0,
                    margin: 0,
                    marginPercent: 0,
                },
            },
        };
    }

    // ==========================================
    // 2. Get Quotation By ID (Canonical)
    // ==========================================
    async getQuotationById(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<CanonicalQuotationResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                organizationId: user.organizationId,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        customerTier: true,
                    },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    include: {
                        lines: {
                            orderBy: { lineNumber: "asc" },
                        },
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        let evaluatedLines: QuotationLineResponse[] = [];
        let quotationEvaluation = undefined;

        if (revision.lines.length > 0) {
            const categories = revision.lines.map((l) => l.category);
            const governance = await this.resolveGovernanceRules(
                user.organizationId,
                quotation.customer.customerTier,
                categories,
            );

            const lineEvals: CanonicalLineEvaluationResult[] = [];

            evaluatedLines = revision.lines.map((line) => {
                const categoryLimit =
                    governance.categoryRuleMap.get(line.category) ?? null;

                const normalizedRules: NormalizedDiscountGovernanceRules = {
                    customerTierLimit: governance.customerTierLimit,
                    categoryLimit,
                    salesManagerThreshold: governance.salesManagerThreshold,
                    financeOperationsThreshold:
                        governance.financeOperationsThreshold,
                };

                const context: DiscountLineContext = {
                    lineId: line.lineNumber,
                    customerTier: quotation.customer.customerTier ?? "BRONZE",
                    productCategory: line.category,
                    discountPercent: line.discountPercent.toNumber(),
                };

                const evaluation = evaluateLineDiscount(context, normalizedRules);
                lineEvals.push(evaluation);

                return {
                    lineNumber: line.lineNumber,
                    productId: line.productId,
                    variantId: line.variantId,
                    name: line.name,
                    sku: line.sku,
                    category: line.category,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice.toNumber(),
                    unitCost: line.unitCost.toNumber(),
                    discountPercent: line.discountPercent.toNumber(),
                    lineSubtotal: line.lineSubtotal.toNumber(),
                    lineDiscount: line.lineDiscount.toNumber(),
                    lineTotal: line.lineTotal.toNumber(),
                    margin: line.margin.toNumber(),
                    marginPercent: line.marginPercent.toNumber(),
                    evaluation,
                };
            });

            quotationEvaluation = evaluateQuotationGovernance({
                lineEvaluations: lineEvals,
                orderDiscountPercent: revision.orderDiscountPercent.toNumber(),
                customerTierLimit: governance.customerTierLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold: governance.financeOperationsThreshold,
                subtotal: revision.subtotal.toNumber(),
                lineDiscountTotal: revision.lineDiscountTotal.toNumber(),
                orderDiscount: revision.orderDiscount.toNumber(),
                marginPercent: revision.marginPercent.toNumber(),
            });
        }

        return {
            id: quotation.id,
            quoteNumber: quotation.quoteNumber,
            customer: {
                id: quotation.customer.id,
                name: quotation.customer.name,
                customerTier: quotation.customer.customerTier,
            },
            status: quotation.status,
            revision: {
                id: revision.id,
                revisionNumber: revision.revisionNumber,
                status: revision.status,
                lines: evaluatedLines,
                orderDiscountPercent: revision.orderDiscountPercent.toNumber(),
                summary: {
                    subtotal: revision.subtotal.toNumber(),
                    lineDiscountTotal: revision.lineDiscountTotal.toNumber(),
                    orderDiscount: revision.orderDiscount.toNumber(),
                    total: revision.total.toNumber(),
                    margin: revision.margin.toNumber(),
                    marginPercent: revision.marginPercent.toNumber(),
                },
                evaluation: quotationEvaluation,
            },
        };
    }

    // ==========================================
    // 3. List Quotations (Pipeline View)
    // ==========================================
    async listQuotations(
        user: AuthenticatedUser,
        query: ListQuotationsQuery,
    ): Promise<QuotationListResponse> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.QuotationWhereInput = {
            organizationId: user.organizationId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.customerId) {
            where.customerId = query.customerId;
        }

        if (query.search) {
            where.OR = [
                { quoteNumber: { contains: query.search, mode: "insensitive" } },
                {
                    customer: {
                        name: { contains: query.search, mode: "insensitive" },
                    },
                },
            ];
        }

        const [quotations, total] = await Promise.all([
            prisma.quotation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
                include: {
                    customer: {
                        select: { id: true, name: true },
                    },
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        select: { total: true },
                    },
                },
            }),
            prisma.quotation.count({ where }),
        ]);

        const cards: QuotationCardResponse[] = quotations.map((q) => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            customer: {
                id: q.customer.id,
                name: q.customer.name,
            },
            status: q.status,
            total: q.revisions[0]?.total.toNumber() ?? 0,
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
        }));

        return {
            quotations: cards,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    // ==========================================
    // 4. Product / Line Preview (Autofill Helper, No DB Mutation)
    // ==========================================
    async previewLine(
        user: AuthenticatedUser,
        quotationId: string,
        input: LinePreviewInput,
    ): Promise<LinePreviewResponse> {
        // Verify quotation exists and belongs to organization
        const quotation = await prisma.quotation.findFirst({
            where: { id: quotationId, organizationId: user.organizationId },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const { productMap, variantMap } = await this.resolveProductsAndVariants(
            user.organizationId,
            [input],
        );

        const product = productMap.get(input.productId);
        if (!product) {
            throw new NotFoundError(
                `Product ${input.productId} not found or inactive.`,
            );
        }

        let variant = null;
        if (input.variantId) {
            variant = variantMap.get(input.variantId);
            if (!variant || variant.productId !== product.id) {
                throw new NotFoundError(
                    `Variant ${input.variantId} not found or does not belong to product ${product.id}.`,
                );
            }
        }

        const unitPrice = variant
            ? variant.price.toNumber()
            : product.basePrice.toNumber();
        const unitCost = variant
            ? variant.cost.toNumber()
            : product.costPrice.toNumber();
        const sku = variant ? variant.sku : null;
        const name = variant ? `${product.name} - ${variant.name}` : product.name;

        const financials = calculateLineCommercials({
            quantity: input.quantity,
            unitPrice,
            unitCost,
            discountPercent: input.discountPercent,
        });

        return {
            lineId: input.lineId,
            productId: product.id,
            variantId: variant ? variant.id : null,
            name,
            sku,
            category: product.category,
            quantity: input.quantity,
            unitPrice,
            unitCost,
            discountPercent: input.discountPercent,
            lineSubtotal: financials.lineSubtotal,
            lineDiscount: financials.lineDiscount,
            lineTotal: financials.lineTotal,
            margin: financials.margin,
            marginPercent: financials.marginPercent,
        };
    }

    // ==========================================
    // 5. Draft Line Recalculation (PATCH, No DB Mutation)
    // ==========================================
    async recalculateLine(
        user: AuthenticatedUser,
        quotationId: string,
        lineNumber: number,
        input: RecalculateLineInput,
    ): Promise<RecalculateLineResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: { id: quotationId, organizationId: user.organizationId },
            include: {
                customer: {
                    select: { id: true, name: true, customerTier: true },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    include: {
                        lines: {
                            where: { lineNumber },
                        },
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        if (revision.status !== QuotationRevisionStatus.DRAFT) {
            throw new BadRequestError("Quotation is not in DRAFT status.");
        }

        const line = revision.lines[0];
        if (!line) {
            throw new NotFoundError(`Quotation line ${lineNumber} not found.`);
        }

        const unitPrice = line.unitPrice.toNumber();
        const unitCost = line.unitCost.toNumber();

        const financials = calculateLineCommercials({
            quantity: input.quantity,
            unitPrice,
            unitCost,
            discountPercent: input.discountPercent,
        });

        const governance = await this.resolveGovernanceRules(
            user.organizationId,
            quotation.customer.customerTier,
            [line.category],
        );

        const categoryLimit =
            governance.categoryRuleMap.get(line.category) ?? null;

        const normalizedRules: NormalizedDiscountGovernanceRules = {
            customerTierLimit: governance.customerTierLimit,
            categoryLimit,
            salesManagerThreshold: governance.salesManagerThreshold,
            financeOperationsThreshold: governance.financeOperationsThreshold,
        };

        const context: DiscountLineContext = {
            lineId: line.lineNumber,
            customerTier: quotation.customer.customerTier ?? "BRONZE",
            productCategory: line.category,
            discountPercent: input.discountPercent,
        };

        const evaluation = evaluateLineDiscount(context, normalizedRules);

        return {
            line: {
                lineNumber: line.lineNumber,
                productId: line.productId,
                variantId: line.variantId,
                name: line.name,
                sku: line.sku,
                category: line.category,
                quantity: input.quantity,
                unitPrice,
                unitCost,
                discountPercent: input.discountPercent,
                lineSubtotal: financials.lineSubtotal,
                lineDiscount: financials.lineDiscount,
                lineTotal: financials.lineTotal,
                margin: financials.margin,
                marginPercent: financials.marginPercent,
            },
            evaluation,
        };
    }

    // ==========================================
    // 6. Draft Quotation Preview (No DB Mutation)
    // ==========================================
    async previewDraft(
        user: AuthenticatedUser,
        quotationId: string,
        input: SaveDraftInput,
    ): Promise<CanonicalQuotationResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: { id: quotationId, organizationId: user.organizationId },
            include: {
                customer: {
                    select: { id: true, name: true, customerTier: true },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        const { productMap, variantMap } = await this.resolveProductsAndVariants(
            user.organizationId,
            input.lines,
        );

        // Pre-validate all products & variants
        const categories: string[] = [];
        for (const item of input.lines) {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new NotFoundError(
                    `Product ${item.productId} not found or inactive.`,
                );
            }
            if (item.variantId) {
                const variant = variantMap.get(item.variantId);
                if (!variant || variant.productId !== product.id) {
                    throw new NotFoundError(
                        `Variant ${item.variantId} not found or does not belong to product ${product.id}.`,
                    );
                }
            }
            categories.push(product.category);
        }

        const governance = await this.resolveGovernanceRules(
            user.organizationId,
            quotation.customer.customerTier,
            categories,
        );

        const evaluatedLines: QuotationLineResponse[] = [];
        const lineEvals: CanonicalLineEvaluationResult[] = [];

        for (const item of input.lines) {
            const product = productMap.get(item.productId)!;
            const variant = item.variantId ? variantMap.get(item.variantId) : null;

            const unitPrice = variant
                ? variant.price.toNumber()
                : product.basePrice.toNumber();
            const unitCost = variant
                ? variant.cost.toNumber()
                : product.costPrice.toNumber();
            const sku = variant ? variant.sku : null;
            const name = variant
                ? `${product.name} - ${variant.name}`
                : product.name;

            const financials = calculateLineCommercials({
                quantity: item.quantity,
                unitPrice,
                unitCost,
                discountPercent: item.discountPercent,
            });

            const categoryLimit =
                governance.categoryRuleMap.get(product.category) ?? null;

            const normalizedRules: NormalizedDiscountGovernanceRules = {
                customerTierLimit: governance.customerTierLimit,
                categoryLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold: governance.financeOperationsThreshold,
            };

            const context: DiscountLineContext = {
                lineId: item.lineNumber,
                customerTier: quotation.customer.customerTier ?? "BRONZE",
                productCategory: product.category,
                discountPercent: item.discountPercent,
            };

            const evaluation = evaluateLineDiscount(context, normalizedRules);
            lineEvals.push(evaluation);

            evaluatedLines.push({
                lineNumber: item.lineNumber,
                productId: product.id,
                variantId: variant ? variant.id : null,
                name,
                sku,
                category: product.category,
                quantity: item.quantity,
                unitPrice,
                unitCost,
                discountPercent: item.discountPercent,
                lineSubtotal: financials.lineSubtotal,
                lineDiscount: financials.lineDiscount,
                lineTotal: financials.lineTotal,
                margin: financials.margin,
                marginPercent: financials.marginPercent,
                evaluation,
            });
        }

        const summary = calculateQuotationSummary(
            evaluatedLines.map((l) => ({
                quantity: l.quantity,
                unitCost: l.unitCost,
                lineSubtotal: l.lineSubtotal,
                lineDiscount: l.lineDiscount,
                lineTotal: l.lineTotal,
            })),
            input.orderDiscountPercent,
        );

        const quotationEvaluation = evaluateQuotationGovernance({
            lineEvaluations: lineEvals,
            orderDiscountPercent: input.orderDiscountPercent,
            customerTierLimit: governance.customerTierLimit,
            salesManagerThreshold: governance.salesManagerThreshold,
            financeOperationsThreshold: governance.financeOperationsThreshold,
            subtotal: summary.subtotal,
            lineDiscountTotal: summary.lineDiscountTotal,
            orderDiscount: summary.orderDiscount,
            marginPercent: summary.marginPercent,
        });

        return {
            id: quotation.id,
            quoteNumber: quotation.quoteNumber,
            customer: {
                id: quotation.customer.id,
                name: quotation.customer.name,
                customerTier: quotation.customer.customerTier,
            },
            status: quotation.status,
            revision: {
                id: revision.id,
                revisionNumber: revision.revisionNumber,
                status: revision.status,
                lines: evaluatedLines,
                orderDiscountPercent: input.orderDiscountPercent,
                summary,
                evaluation: quotationEvaluation,
            },
        };
    }

    // ==========================================
    // 7. Save Draft (PUT, Transactional Line Reconciliation)
    // ==========================================
    async saveDraft(
        user: AuthenticatedUser,
        quotationId: string,
        input: SaveDraftInput,
    ): Promise<CanonicalQuotationResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: { id: quotationId, organizationId: user.organizationId },
            include: {
                customer: {
                    select: { id: true, name: true, customerTier: true },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        if (
            quotation.status !== QuotationStatus.DRAFT ||
            revision.status !== QuotationRevisionStatus.DRAFT
        ) {
            throw new BadRequestError(
                "Quotation is not in DRAFT status and cannot be edited.",
            );
        }

        const { productMap, variantMap } = await this.resolveProductsAndVariants(
            user.organizationId,
            input.lines,
        );

        const categories: string[] = [];
        for (const item of input.lines) {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new NotFoundError(
                    `Product ${item.productId} not found or inactive.`,
                );
            }
            if (item.variantId) {
                const variant = variantMap.get(item.variantId);
                if (!variant || variant.productId !== product.id) {
                    throw new NotFoundError(
                        `Variant ${item.variantId} not found or does not belong to product ${product.id}.`,
                    );
                }
            }
            categories.push(product.category);
        }

        const governance = await this.resolveGovernanceRules(
            user.organizationId,
            quotation.customer.customerTier,
            categories,
        );

        const evaluatedLines: QuotationLineResponse[] = [];
        const lineEvals: CanonicalLineEvaluationResult[] = [];
        const linesToCreate: Prisma.QuotationLineCreateManyInput[] = [];

        for (const item of input.lines) {
            const product = productMap.get(item.productId)!;
            const variant = item.variantId ? variantMap.get(item.variantId) : null;

            const unitPrice = variant
                ? variant.price.toNumber()
                : product.basePrice.toNumber();
            const unitCost = variant
                ? variant.cost.toNumber()
                : product.costPrice.toNumber();
            const sku = variant ? variant.sku : null;
            const name = variant
                ? `${product.name} - ${variant.name}`
                : product.name;

            const financials = calculateLineCommercials({
                quantity: item.quantity,
                unitPrice,
                unitCost,
                discountPercent: item.discountPercent,
            });

            const categoryLimit =
                governance.categoryRuleMap.get(product.category) ?? null;

            const normalizedRules: NormalizedDiscountGovernanceRules = {
                customerTierLimit: governance.customerTierLimit,
                categoryLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold: governance.financeOperationsThreshold,
            };

            const context: DiscountLineContext = {
                lineId: item.lineNumber,
                customerTier: quotation.customer.customerTier ?? "BRONZE",
                productCategory: product.category,
                discountPercent: item.discountPercent,
            };

            const evaluation = evaluateLineDiscount(context, normalizedRules);
            lineEvals.push(evaluation);

            evaluatedLines.push({
                lineNumber: item.lineNumber,
                productId: product.id,
                variantId: variant ? variant.id : null,
                name,
                sku,
                category: product.category,
                quantity: item.quantity,
                unitPrice,
                unitCost,
                discountPercent: item.discountPercent,
                lineSubtotal: financials.lineSubtotal,
                lineDiscount: financials.lineDiscount,
                lineTotal: financials.lineTotal,
                margin: financials.margin,
                marginPercent: financials.marginPercent,
                evaluation,
            });

            linesToCreate.push({
                revisionId: revision.id,
                productId: product.id,
                variantId: variant ? variant.id : null,
                lineNumber: item.lineNumber,
                name,
                sku,
                category: product.category,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(unitPrice),
                unitCost: new Prisma.Decimal(unitCost),
                discountPercent: new Prisma.Decimal(item.discountPercent),
                lineSubtotal: new Prisma.Decimal(financials.lineSubtotal),
                lineDiscount: new Prisma.Decimal(financials.lineDiscount),
                lineTotal: new Prisma.Decimal(financials.lineTotal),
                margin: new Prisma.Decimal(financials.margin),
                marginPercent: new Prisma.Decimal(financials.marginPercent),
            });
        }

        const summary = calculateQuotationSummary(
            evaluatedLines.map((l) => ({
                quantity: l.quantity,
                unitCost: l.unitCost,
                lineSubtotal: l.lineSubtotal,
                lineDiscount: l.lineDiscount,
                lineTotal: l.lineTotal,
            })),
            input.orderDiscountPercent,
        );

        const quotationEvaluation = evaluateQuotationGovernance({
            lineEvaluations: lineEvals,
            orderDiscountPercent: input.orderDiscountPercent,
            customerTierLimit: governance.customerTierLimit,
            salesManagerThreshold: governance.salesManagerThreshold,
            financeOperationsThreshold: governance.financeOperationsThreshold,
            subtotal: summary.subtotal,
            lineDiscountTotal: summary.lineDiscountTotal,
            orderDiscount: summary.orderDiscount,
            marginPercent: summary.marginPercent,
        });

        // Transactional reconciliation: delete existing lines, insert submitted lines, update revision totals
        await prisma.$transaction(async (tx) => {
            await tx.quotationLine.deleteMany({
                where: { revisionId: revision.id },
            });

            if (linesToCreate.length > 0) {
                await tx.quotationLine.createMany({
                    data: linesToCreate,
                });
            }

            await tx.quotationRevision.update({
                where: { id: revision.id },
                data: {
                    orderDiscountPercent: new Prisma.Decimal(
                        input.orderDiscountPercent,
                    ),
                    subtotal: new Prisma.Decimal(summary.subtotal),
                    lineDiscountTotal: new Prisma.Decimal(summary.lineDiscountTotal),
                    orderDiscount: new Prisma.Decimal(summary.orderDiscount),
                    total: new Prisma.Decimal(summary.total),
                    margin: new Prisma.Decimal(summary.margin),
                    marginPercent: new Prisma.Decimal(summary.marginPercent),
                },
            });
        });

        return {
            id: quotation.id,
            quoteNumber: quotation.quoteNumber,
            customer: {
                id: quotation.customer.id,
                name: quotation.customer.name,
                customerTier: quotation.customer.customerTier,
            },
            status: QuotationStatus.DRAFT,
            revision: {
                id: revision.id,
                revisionNumber: revision.revisionNumber,
                status: QuotationRevisionStatus.DRAFT,
                lines: evaluatedLines,
                orderDiscountPercent: input.orderDiscountPercent,
                summary,
                evaluation: quotationEvaluation,
            },
        };
    }

    // ==========================================
    // 8. Submit For Approval (Authoritative Re-evaluation & Freeze)
    // ==========================================
    async submitQuotation(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<SubmitQuotationResponse> {
        const quotation = await prisma.quotation.findFirst({
            where: { id: quotationId, organizationId: user.organizationId },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        customerTier: true,
                        role: true,
                        isActive: true,
                    },
                },
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    include: {
                        lines: {
                            orderBy: { lineNumber: "asc" },
                        },
                    },
                },
            },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const revision = quotation.revisions[0];
        if (!revision) {
            throw new NotFoundError("Quotation revision not found.");
        }

        if (
            quotation.status !== QuotationStatus.DRAFT ||
            revision.status !== QuotationRevisionStatus.DRAFT
        ) {
            throw new BadRequestError("Only DRAFT quotations can be submitted.");
        }

        if (
            !quotation.customer ||
            !quotation.customer.isActive ||
            quotation.customer.role !== UserRole.CUSTOMER
        ) {
            throw new BadRequestError(
                "Customer associated with this quotation is inactive or invalid.",
            );
        }

        if (revision.lines.length === 0) {
            throw new BadRequestError("Cannot submit an empty quotation.");
        }

        // Authoritatively verify products & variants are active and sellable
        const { productMap, variantMap } = await this.resolveProductsAndVariants(
            user.organizationId,
            revision.lines,
        );

        for (const line of revision.lines) {
            const product = productMap.get(line.productId);
            if (!product) {
                throw new NotFoundError(
                    `Product ${line.productId} not found or inactive.`,
                );
            }
            if (line.variantId) {
                const variant = variantMap.get(line.variantId);
                if (!variant || variant.productId !== product.id) {
                    throw new NotFoundError(
                        `Variant ${line.variantId} not found or inactive.`,
                    );
                }
            }
        }

        // Authoritatively resolve governance rules
        const categories = revision.lines.map((l) => l.category);
        const governance = await this.resolveGovernanceRules(
            user.organizationId,
            quotation.customer.customerTier,
            categories,
        );

        const lineEvals: CanonicalLineEvaluationResult[] = [];

        for (const line of revision.lines) {
            const categoryLimit =
                governance.categoryRuleMap.get(line.category) ?? null;

            const normalizedRules: NormalizedDiscountGovernanceRules = {
                customerTierLimit: governance.customerTierLimit,
                categoryLimit,
                salesManagerThreshold: governance.salesManagerThreshold,
                financeOperationsThreshold: governance.financeOperationsThreshold,
            };

            const context: DiscountLineContext = {
                lineId: line.lineNumber,
                customerTier: quotation.customer.customerTier ?? "BRONZE",
                productCategory: line.category,
                discountPercent: line.discountPercent.toNumber(),
            };

            const evaluation = evaluateLineDiscount(context, normalizedRules);
            lineEvals.push(evaluation);
        }

        const quotationEvaluation = evaluateQuotationGovernance({
            lineEvaluations: lineEvals,
            orderDiscountPercent: revision.orderDiscountPercent.toNumber(),
            customerTierLimit: governance.customerTierLimit,
            salesManagerThreshold: governance.salesManagerThreshold,
            financeOperationsThreshold: governance.financeOperationsThreshold,
            subtotal: revision.subtotal.toNumber(),
            lineDiscountTotal: revision.lineDiscountTotal.toNumber(),
            orderDiscount: revision.orderDiscount.toNumber(),
            marginPercent: revision.marginPercent.toNumber(),
        });

        // Determine final statuses based on deterministic evaluation
        let finalQuotationStatus: QuotationStatus;
        let finalRevisionStatus: QuotationRevisionStatus;

        if (quotationEvaluation.status === EvaluationStatus.REJECTED) {
            finalQuotationStatus = QuotationStatus.REJECTED;
            finalRevisionStatus = QuotationRevisionStatus.REJECTED;
        } else if (
            quotationEvaluation.status === EvaluationStatus.APPROVAL_REQUIRED
        ) {
            finalQuotationStatus = QuotationStatus.PENDING_APPROVAL;
            finalRevisionStatus = QuotationRevisionStatus.PENDING_APPROVAL;
        } else {
            finalQuotationStatus = QuotationStatus.APPROVED;
            finalRevisionStatus = QuotationRevisionStatus.APPROVED;
        }

        // Freeze revision, update quotation status, and conditionally create approval workflow transactionally
        let createdApprovalRequestId: string | undefined;

        await prisma.$transaction(async (tx) => {
            await tx.quotationRevision.update({
                where: { id: revision.id },
                data: {
                    status: finalRevisionStatus,
                },
            });

            await tx.quotation.update({
                where: { id: quotation.id },
                data: {
                    status: finalQuotationStatus,
                },
            });

            if (finalQuotationStatus === QuotationStatus.PENDING_APPROVAL) {
                const stepsData: Prisma.ApprovalStepCreateWithoutApprovalRequestInput[] = [
                    {
                        level: ApprovalStepLevel.SALES_MANAGER,
                        status: ApprovalStepStatus.PENDING,
                    },
                ];

                if (
                    quotationEvaluation.approvalLevel ===
                    DiscountApprovalLevel.FINANCE_OPERATIONS
                ) {
                    stepsData.push({
                        level: ApprovalStepLevel.FINANCE_OPERATIONS,
                        status: ApprovalStepStatus.PENDING,
                    });
                }

                const approvalRequest = await tx.approvalRequest.create({
                    data: {
                        quotationId: quotation.id,
                        revisionId: revision.id,
                        status: ApprovalRequestStatus.PENDING,
                        steps: {
                            create: stepsData,
                        },
                    },
                });

                createdApprovalRequestId = approvalRequest.id;
            }
        });

        const response: SubmitQuotationResponse = {
            status: finalQuotationStatus,
            approvalLevel: quotationEvaluation.approvalLevel,
            blendedRiskScore: quotationEvaluation.blendedRiskScore,
            lines: lineEvals,
        };

        if (createdApprovalRequestId) {
            response.approvalRequestId = createdApprovalRequestId;
        }

        return response;
    }
}

export const quotationService = new QuotationService();
