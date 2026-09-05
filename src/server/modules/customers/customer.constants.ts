import { UserRole } from "@prisma/client";

export const DEFAULT_CUSTOMER_PAGE = 1;
export const DEFAULT_CUSTOMER_LIMIT = 10;
export const MAX_CUSTOMER_LIMIT = 100;

export const DEFAULT_CUSTOMER_TIER = "BRONZE" as const;

export const CUSTOMER_READ_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FINANCE_OPERATIONS,
];

export const CUSTOMER_CREATE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
];

export const CUSTOMER_UPDATE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
];

export const CUSTOMER_STATUS_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
];
