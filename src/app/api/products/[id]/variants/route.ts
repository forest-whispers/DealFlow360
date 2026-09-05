import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { productService } from "@/server/modules/products/product.service";
import {
    createVariantSchema,
    productIdParamSchema,
} from "@/server/modules/products/product.validation";
import {
    PRODUCT_MANAGE_ROLES,
    PRODUCT_READ_ROLES,
} from "@/server/modules/products/product.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_READ_ROLES);
        const rawParams = await context.params;
        const { id } = productIdParamSchema.parse(rawParams);
        const result = await productService.listVariants(user, id);

        return ok(result);
    },
);

export const POST = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id } = productIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, createVariantSchema);
        const variant = await productService.createVariant(user, id, dto);

        return created({
            variant,
        });
    },
);
