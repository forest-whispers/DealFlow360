import { NextRequest } from "next/server";

import { requireRole } from "@/server/shared/auth/authorization";
import { productService } from "@/server/modules/products/product.service";
import {
    createProductSchema,
    listProductsSchema,
} from "@/server/modules/products/product.validation";
import {
    PRODUCT_MANAGE_ROLES,
    PRODUCT_READ_ROLES,
} from "@/server/modules/products/product.constants";
import { parseBody } from "@/server/shared/http/parseBody";
import { getQuery } from "@/server/shared/http/query";
import { createRouteHandler } from "@/server/shared/http/route";
import { created, ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (request: NextRequest) => {
        const user = await requireRole(...PRODUCT_READ_ROLES);
        const rawQuery = getQuery(request);
        const query = listProductsSchema.parse(rawQuery);
        const result = await productService.listProducts(user, query);

        return ok(result);
    },
);

export const POST = createRouteHandler(
    async (request: NextRequest) => {
        const user = await requireRole(...PRODUCT_MANAGE_ROLES);
        const dto = await parseBody(request, createProductSchema);
        const product = await productService.createProduct(user, dto);

        return created({
            product,
        });
    },
);
