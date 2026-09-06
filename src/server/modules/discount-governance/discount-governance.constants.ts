import { UserRole } from "@prisma/client";

export const GOVERNANCE_CONFIG_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
] as const;

export const GOVERNANCE_EVALUATE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const EvaluationStatus = {
    WITHIN_LIMIT: "WITHIN_LIMIT",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    REJECTED: "REJECTED",
} as const;

export type EvaluationStatus =
    (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

export const DiscountApprovalLevel = {
    NONE: "NONE",
    SALES_MANAGER: "SALES_MANAGER",
    FINANCE_OPERATIONS: "FINANCE_OPERATIONS",
} as const;

export type DiscountApprovalLevel =
    (typeof DiscountApprovalLevel)[keyof typeof DiscountApprovalLevel];

export const MIN_DISCOUNT_PERCENT = 0;
export const MAX_DISCOUNT_PERCENT = 100;
