import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { productService } from "@/server/modules/products/product.service";
import {
    productVariantParamsSchema,
    updateVariantSchema,
} from "@/server/modules/products/product.validation";
import {
    PRODUCT_MANAGE_ROLES,
    PRODUCT_READ_ROLES,
} from "@/server/modules/products/product.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_READ_ROLES);
        const rawParams = await context.params;
        const { id, variantId } = productVariantParamsSchema.parse(rawParams);
        const variant = await productService.getVariantById(user, id, variantId);

        return ok({
            variant,
        });
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id, variantId } = productVariantParamsSchema.parse(rawParams);
        const dto = await parseBody(request, updateVariantSchema);
        const variant = await productService.updateVariant(
            user,
            id,
            variantId,
            dto,
        );

        return ok({
            variant,
        });
    },
);

export const DELETE = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id, variantId } = productVariantParamsSchema.parse(rawParams);
        const result = await productService.archiveVariant(user, id, variantId);

        return ok(result);
    },
);
