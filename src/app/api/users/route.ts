import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { userService } from "@/server/modules/users/user.service";
import { listUsersSchema } from "@/server/modules/users/user.validation";
import { getQuery } from "@/server/shared/http/query";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(async (request: NextRequest) => {
    const user = await requireRole(UserRole.ADMIN);
    const rawQuery = getQuery(request);
    const query = listUsersSchema.parse(rawQuery);
    const result = await userService.listUsers(user, query);

    return ok(result);
});
