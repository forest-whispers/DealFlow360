import { clearSessionCookie } from "@/server/modules/auth/auth.session";

import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";

export const POST = createRouteHandler(
    async () => {
        await clearSessionCookie();

        return ok({
            message: "Logged out successfully.",
        });
    },
);