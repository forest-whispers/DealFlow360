import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { userService } from "@/server/modules/users/user.service";
import {
    updateUserStatusSchema,
    userIdParamSchema,
} from "@/server/modules/users/user.validation";
import { parseBody } from "@/server/shared/http/parseBody";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const PATCH = createRouteHandler(
    async (request: NextRequest, context: { params?: Promise<unknown> }) => {
        const user = await requireRole(UserRole.ADMIN);
        const rawParams = await context.params;
        const { id } = userIdParamSchema.parse(rawParams);
        const dto = await parseBody(request, updateUserStatusSchema);
        const result = await userService.updateUserStatus(user, id, dto.isActive);

        return ok(result);
    }
);
