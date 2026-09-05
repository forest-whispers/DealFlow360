import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { userService } from "@/server/modules/users/user.service";
import { userIdParamSchema } from "@/server/modules/users/user.validation";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async (_request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(UserRole.ADMIN);
        const rawParams = await context.params;
        const { id } = userIdParamSchema.parse(rawParams);
        const result = await userService.getUserById(user, id);

        return ok(result);
    }
);
