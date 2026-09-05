import { BillingType, UserRole } from "@prisma/client";

export const DEFAULT_PRODUCT_PAGE = 1;
export const DEFAULT_PRODUCT_LIMIT = 10;
export const MAX_PRODUCT_LIMIT = 100;

export const DEFAULT_BILLING_TYPE = BillingType.ONE_TIME;

export const MIN_PRICE = 0;
export const MAX_PRICE = 9999999999.99;

export const PRODUCT_READ_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FINANCE_OPERATIONS,
];

export const PRODUCT_MANAGE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
];
