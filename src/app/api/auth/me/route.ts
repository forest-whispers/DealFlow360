import { requireAuth } from "@/server/shared/auth/authorization";

import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const GET = createRouteHandler(
    async () => {
        const user = await requireAuth();

        return ok({
            user,
        });
    },
);