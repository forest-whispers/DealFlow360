import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    ApprovalStepStatus,
    UserRole,
} from "@prisma/client";

export { ApprovalRequestStatus, ApprovalStepLevel, ApprovalStepStatus };

export const APPROVAL_READ_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FINANCE_OPERATIONS,
];

export const APPROVAL_ACTION_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
];

export const SALES_MANAGER_STEP_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.SALES_MANAGER,
];

export const FINANCE_OPERATIONS_STEP_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.FINANCE_OPERATIONS,
];

export const APPROVAL_STEP_ORDER: ApprovalStepLevel[] = [
    ApprovalStepLevel.SALES_MANAGER,
    ApprovalStepLevel.FINANCE_OPERATIONS,
];
