import { NextRequest } from "next/server";

import { authService } from "@/server/modules/auth/auth.service";
import { loginSchema } from "@/server/modules/auth/auth.validation";

import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (request: NextRequest) => {
        const dto = await parseBody(
            request,
            loginSchema,
        );

        const user =
            await authService.login(dto);

        return ok({
            user,
        });
    },
);