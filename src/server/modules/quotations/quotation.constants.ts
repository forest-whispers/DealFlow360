import { QuotationRevisionStatus, QuotationStatus, UserRole } from "@prisma/client";

export const QUOTATION_CREATE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
] as const;

export const QUOTATION_MANAGE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
] as const;

export const QUOTATION_READ_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const DEFAULT_QUOTATION_PAGE = 1;
export const DEFAULT_QUOTATION_LIMIT = 20;
export const MAX_QUOTATION_LIMIT = 100;

export { QuotationRevisionStatus, QuotationStatus };
