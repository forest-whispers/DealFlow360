import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { productService } from "@/server/modules/products/product.service";
import {
    productIdParamSchema,
    updateProductSchema,
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
        const { id } = productIdParamSchema.parse(rawParams);
        const product = await productService.getProductById(user, id);

        return ok({
            product,
        });
    },
);

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = productIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateProductSchema);
        const product = await productService.updateProduct(user, id, dto);

        return ok({
            product,
        });
    },
);

export const DELETE = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = productIdParamSchema.parse(rawParams);
        const result = await productService.archiveProduct(user, id);

        return ok(result);
    },
);
