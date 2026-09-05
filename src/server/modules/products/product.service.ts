import { BillingType, Prisma, Product, ProductVariant } from "@prisma/client";

import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import type {
    CreateProductInput,
    CreateVariantInput,
    ListProductsQuery,
    ProductArchiveResponse,
    ProductDetailResponse,
    ProductListResponse,
    ProductResponse,
    ProductStatusResponse,
    ProductVariantArchiveResponse,
    ProductVariantListResponse,
    ProductVariantResponse,
    ProductVariantStatusResponse,
    UpdateProductInput,
    UpdateVariantInput,
} from "./product.types";

export type ProductWithCount = Product & {
    _count?: {
        variants: number;
    };
};

export function mapProductToResponse(record: ProductWithCount): ProductResponse {
    const response: ProductResponse = {
        id: record.id,
        name: record.name,
        description: record.description,
        category: record.category,
        isActive: record.isActive,
        basePrice: record.basePrice.toNumber(),
        costPrice: record.costPrice.toNumber(),
        billingType: record.billingType,
        billingInterval: record.billingInterval ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };

    if (record._count?.variants !== undefined) {
        response.variantsCount = record._count.variants;
    }

    return response;
}

export function mapVariantToResponse(record: ProductVariant): ProductVariantResponse {
    let attributes: Record<string, unknown> | null = null;
    if (
        record.attributes !== null &&
        typeof record.attributes === "object" &&
        !Array.isArray(record.attributes)
    ) {
        attributes = record.attributes as Record<string, unknown>;
    }

    return {
        id: record.id,
        productId: record.productId,
        sku: record.sku,
        name: record.name,
        price: record.price.toNumber(),
        cost: record.cost.toNumber(),
        isActive: record.isActive,
        attributes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class ProductService {
    async listProducts(
        user: AuthenticatedUser,
        query: ListProductsQuery,
    ): Promise<ProductListResponse> {
        const { page, limit, search, category, billingType, isActive } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            organizationId: user.organizationId,
            ...(category ? { category } : {}),
            ...(billingType ? { billingType } : {}),
            ...(query.billingInterval ? { billingInterval: query.billingInterval } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
            ...(search
                ? {
                      OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          { description: { contains: search, mode: "insensitive" } },
                          { category: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [total, products] = await prisma.$transaction([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            variants: true,
                        },
                    },
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            products: products.map(mapProductToResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    async getProductById(
        user: AuthenticatedUser,
        productId: string,
    ): Promise<ProductResponse> {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            include: {
                _count: {
                    select: {
                        variants: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundError("Product not found.");
        }

        return mapProductToResponse(product);
    }

    async createProduct(
        user: AuthenticatedUser,
        input: CreateProductInput,
    ): Promise<ProductResponse> {
        const billingType = input.billingType ?? BillingType.ONE_TIME;
        let billingInterval = input.billingInterval ?? null;

        if (billingType === BillingType.RECURRING && !billingInterval) {
            throw new BadRequestError(
                "Billing interval is required for RECURRING products.",
            );
        }
        if (billingType === BillingType.ONE_TIME) {
            billingInterval = null;
        }

        const createdProduct = await prisma.product.create({
            data: {
                name: input.name,
                description: input.description ?? null,
                category: input.category,
                basePrice: new Prisma.Decimal(input.basePrice),
                costPrice: new Prisma.Decimal(input.costPrice),
                billingType,
                billingInterval,
                isActive: input.isActive ?? true,
                organizationId: user.organizationId,
            },
            include: {
                _count: {
                    select: {
                        variants: true,
                    },
                },
            },
        });

        return mapProductToResponse(createdProduct);
    }

    async updateProduct(
        user: AuthenticatedUser,
        productId: string,
        input: UpdateProductInput,
    ): Promise<ProductResponse> {
        const existingProduct = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                billingType: true,
                billingInterval: true,
            },
        });

        if (!existingProduct) {
            throw new NotFoundError("Product not found.");
        }

        const updateData: Prisma.ProductUpdateInput = {};

        if (input.name !== undefined) {
            updateData.name = input.name;
        }
        if (input.description !== undefined) {
            updateData.description = input.description;
        }
        if (input.category !== undefined) {
            updateData.category = input.category;
        }
        if (input.basePrice !== undefined) {
            updateData.basePrice = new Prisma.Decimal(input.basePrice);
        }
        if (input.costPrice !== undefined) {
            updateData.costPrice = new Prisma.Decimal(input.costPrice);
        }
        if (input.isActive !== undefined) {
            updateData.isActive = input.isActive;
        }

        // Validate resulting billing combination
        const effectiveBillingType =
            input.billingType !== undefined
                ? input.billingType
                : existingProduct.billingType;
        let effectiveBillingInterval =
            input.billingInterval !== undefined
                ? input.billingInterval
                : existingProduct.billingInterval;

        if (effectiveBillingType === BillingType.ONE_TIME) {
            effectiveBillingInterval = null;
        } else if (effectiveBillingType === BillingType.RECURRING) {
            if (!effectiveBillingInterval) {
                throw new BadRequestError(
                    "Billing interval is required for RECURRING products.",
                );
            }
        }

        if (
            input.billingType !== undefined ||
            input.billingInterval !== undefined ||
            effectiveBillingInterval !== existingProduct.billingInterval
        ) {
            updateData.billingType = effectiveBillingType;
            updateData.billingInterval = effectiveBillingInterval;
        }

        const updatedProduct = await prisma.product.update({
            where: {
                id: productId,
            },
            data: updateData,
            include: {
                _count: {
                    select: {
                        variants: true,
                    },
                },
            },
        });

        return mapProductToResponse(updatedProduct);
    }

    async archiveProduct(
        user: AuthenticatedUser,
        productId: string,
    ): Promise<ProductArchiveResponse> {
        const existingProduct = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!existingProduct) {
            throw new NotFoundError("Product not found.");
        }

        if (existingProduct.isActive) {
            await prisma.product.update({
                where: {
                    id: productId,
                },
                data: {
                    isActive: false,
                },
            });
        }

        return {
            message: "Product archived successfully.",
        };
    }

    async updateProductStatus(
        user: AuthenticatedUser,
        productId: string,
        isActive: boolean,
    ): Promise<ProductStatusResponse> {
        const existingProduct = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!existingProduct) {
            throw new NotFoundError("Product not found.");
        }

        const updated = await prisma.product.update({
            where: {
                id: productId,
            },
            data: {
                isActive,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        return {
            product: {
                id: updated.id,
                isActive: updated.isActive,
            },
        };
    }

    // ==========================================
    // VARIANTS
    // ==========================================

    async listVariants(
        user: AuthenticatedUser,
        productId: string,
    ): Promise<ProductVariantListResponse> {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
            },
        });

        if (!product) {
            throw new NotFoundError("Product not found.");
        }

        const variants = await prisma.productVariant.findMany({
            where: {
                productId,
                organizationId: user.organizationId,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return {
            variants: variants.map(mapVariantToResponse),
        };
    }

    async getVariantById(
        user: AuthenticatedUser,
        productId: string,
        variantId: string,
    ): Promise<ProductVariantResponse> {
        const variant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
                organizationId: user.organizationId,
            },
        });

        if (!variant) {
            throw new NotFoundError("Product variant not found.");
        }

        return mapVariantToResponse(variant);
    }

    async createVariant(
        user: AuthenticatedUser,
        productId: string,
        input: CreateVariantInput,
    ): Promise<ProductVariantResponse> {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!product) {
            throw new NotFoundError("Product not found.");
        }

        // An inactive Product must not allow creation of active variants
        const variantIsActive = input.isActive ?? true;
        if (!product.isActive && variantIsActive) {
            throw new ConflictError(
                "Cannot create an active variant under an inactive product. Activate the product first.",
            );
        }

        // Check SKU uniqueness within the organization
        const existingSku = await prisma.productVariant.findUnique({
            where: {
                organizationId_sku: {
                    organizationId: user.organizationId,
                    sku: input.sku,
                },
            },
            select: {
                id: true,
            },
        });

        if (existingSku) {
            throw new ConflictError(
                "A variant with this SKU already exists in this organization.",
            );
        }

        let attributesData: Prisma.ProductVariantCreateInput["attributes"] = undefined;
        if (input.attributes === null) {
            attributesData = Prisma.JsonNull;
        } else if (input.attributes !== undefined) {
            attributesData = input.attributes as Prisma.InputJsonValue;
        }

        const createdVariant = await prisma.productVariant.create({
            data: {
                productId,
                organizationId: user.organizationId,
                sku: input.sku,
                name: input.name,
                price: new Prisma.Decimal(input.price),
                cost: new Prisma.Decimal(input.cost),
                isActive: variantIsActive,
                attributes: attributesData,
            },
        });

        return mapVariantToResponse(createdVariant);
    }

    async updateVariant(
        user: AuthenticatedUser,
        productId: string,
        variantId: string,
        input: UpdateVariantInput,
    ): Promise<ProductVariantResponse> {
        const existingVariant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
                organizationId: user.organizationId,
            },
            include: {
                product: {
                    select: {
                        isActive: true,
                    },
                },
            },
        });

        if (!existingVariant) {
            throw new NotFoundError("Product variant not found.");
        }

        // An active variant must not be possible under an inactive Product
        if (input.isActive === true && !existingVariant.product.isActive) {
            throw new ConflictError(
                "Cannot activate a variant under an inactive product. Activate the product first.",
            );
        }

        // Check SKU uniqueness if changed
        if (input.sku && input.sku !== existingVariant.sku) {
            const conflict = await prisma.productVariant.findUnique({
                where: {
                    organizationId_sku: {
                        organizationId: user.organizationId,
                        sku: input.sku,
                    },
                },
                select: {
                    id: true,
                },
            });

            if (conflict && conflict.id !== variantId) {
                throw new ConflictError(
                    "A variant with this SKU already exists in this organization.",
                );
            }
        }

        const updateData: Prisma.ProductVariantUpdateInput = {};

        if (input.sku !== undefined) {
            updateData.sku = input.sku;
        }
        if (input.name !== undefined) {
            updateData.name = input.name;
        }
        if (input.price !== undefined) {
            updateData.price = new Prisma.Decimal(input.price);
        }
        if (input.cost !== undefined) {
            updateData.cost = new Prisma.Decimal(input.cost);
        }
        if (input.isActive !== undefined) {
            updateData.isActive = input.isActive;
        }
        if (input.attributes === null) {
            updateData.attributes = Prisma.JsonNull;
        } else if (input.attributes !== undefined) {
            updateData.attributes = input.attributes as Prisma.InputJsonValue;
        }

        const updatedVariant = await prisma.productVariant.update({
            where: {
                id: variantId,
            },
            data: updateData,
        });

        return mapVariantToResponse(updatedVariant);
    }

    async archiveVariant(
        user: AuthenticatedUser,
        productId: string,
        variantId: string,
    ): Promise<ProductVariantArchiveResponse> {
        const existingVariant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
                organizationId: user.organizationId,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!existingVariant) {
            throw new NotFoundError("Product variant not found.");
        }

        if (existingVariant.isActive) {
            await prisma.productVariant.update({
                where: {
                    id: variantId,
                },
                data: {
                    isActive: false,
                },
            });
        }

        return {
            message: "Product variant archived successfully.",
        };
    }

    async updateVariantStatus(
        user: AuthenticatedUser,
        productId: string,
        variantId: string,
        isActive: boolean,
    ): Promise<ProductVariantStatusResponse> {
        const existingVariant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
                organizationId: user.organizationId,
            },
            include: {
                product: {
                    select: {
                        isActive: true,
                    },
                },
            },
        });

        if (!existingVariant) {
            throw new NotFoundError("Product variant not found.");
        }

        if (isActive && !existingVariant.product.isActive) {
            throw new ConflictError(
                "Cannot activate a variant under an inactive product. Activate the product first.",
            );
        }

        const updated = await prisma.productVariant.update({
            where: {
                id: variantId,
            },
            data: {
                isActive,
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        return {
            variant: {
                id: updated.id,
                isActive: updated.isActive,
            },
        };
    }
}

export const productService = new ProductService();
