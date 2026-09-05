import { UserRole } from "@prisma/client";

export const DEFAULT_USER_PAGE = 1;
export const DEFAULT_USER_LIMIT = 20;
export const MAX_USER_LIMIT = 100;

export const INTERNAL_USER_ROLES = [
    UserRole.ADMIN,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
] as const;

export type InternalUserRole = (typeof INTERNAL_USER_ROLES)[number];

export const USER_ADMIN_ROLES = [UserRole.ADMIN] as const;
