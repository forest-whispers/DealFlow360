import { NextRequest } from "next/server";

import { authService } from "@/server/modules/auth/auth.service";
import { signupSchema } from "@/server/modules/auth/auth.validation";

import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { created } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async (request: NextRequest) => {
        const dto = await parseBody(
            request,
            signupSchema,
        );

        const user =
            await authService.signup(dto);

        return created({
            user,
        });
    },
);