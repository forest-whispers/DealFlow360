import { UserRole } from "@prisma/client";
import { requireRole } from "@/server/shared/auth/authorization";
import { createRouteHandler } from "@/server/shared/http/route";
import { ok } from "@/server/shared/http/response";
import { dashboardService } from "@/server/modules/dashboard/dashboard.service";

/**
 * Commercial Operations Dashboard API
 * Strictly internal sales operations roles: ADMIN, SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS.
 * Customers are excluded.
 */
const ALLOWED_DASHBOARD_ROLES = [
    UserRole.ADMIN,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const GET = createRouteHandler(async () => {
    const user = await requireRole(...ALLOWED_DASHBOARD_ROLES);
    const result = await dashboardService.getDashboardData(user);
    return ok(result);
});
