import {
    BillingInterval,
    InvoiceStatus,
    SubscriptionStatus,
    UserRole,
} from "@prisma/client";

export const BILLING_GENERATE_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
] as const;

export const INVOICE_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.CUSTOMER,
] as const;

export const INVOICE_PAY_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.CUSTOMER,
] as const;

export const SUBSCRIPTION_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.CUSTOMER,
] as const;

export const BILLING_PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

export { BillingInterval, InvoiceStatus, SubscriptionStatus };
