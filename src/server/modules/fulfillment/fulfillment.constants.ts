import {
    FulfillmentLineStatus,
    FulfillmentStatus,
    UserRole,
} from "@prisma/client";

export const FULFILLMENT_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
] as const;

export const FULFILLMENT_CREATE_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
] as const;

export const FULFILLMENT_PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

export { FulfillmentStatus, FulfillmentLineStatus };
