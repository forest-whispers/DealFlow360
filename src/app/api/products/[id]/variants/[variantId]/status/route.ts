import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { productService } from "@/server/modules/products/product.service";
import {
    productVariantParamsSchema,
    updateVariantStatusSchema,
} from "@/server/modules/products/product.validation";
import { PRODUCT_MANAGE_ROLES } from "@/server/modules/products/product.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const rawParams = await context.params;
        const { id, variantId } = productVariantParamsSchema.parse(rawParams);
        const dto = await parseBody(request, updateVariantStatusSchema);
        const result = await productService.updateVariantStatus(
            user,
            id,
            variantId,
            dto.isActive,
        );

        return ok(result);
    },
);
