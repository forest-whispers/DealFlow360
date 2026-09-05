import { UserRole, WarehouseStatus } from "@prisma/client";

export const WAREHOUSE_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
] as const;

export const WAREHOUSE_MANAGE_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const INVENTORY_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
] as const;

export const INVENTORY_MANAGE_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const WAREHOUSE_PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

export { WarehouseStatus };
