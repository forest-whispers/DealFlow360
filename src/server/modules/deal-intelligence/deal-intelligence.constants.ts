import { UserRole } from "@prisma/client";

export const DEAL_INTELLIGENCE_ROLES = [
    UserRole.ADMIN,
    UserRole.SALES_REP,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_OPERATIONS,
] as const;

export const DealHealthStatus = {
    HEALTHY: "HEALTHY",
    WATCH: "WATCH",
    AT_RISK: "AT_RISK",
    CRITICAL: "CRITICAL",
} as const;
export type DealHealthStatus =
    (typeof DealHealthStatus)[keyof typeof DealHealthStatus];

export const DealRiskFactorType = {
    DISCOUNT: "DISCOUNT",
    MARGIN: "MARGIN",
    APPROVAL: "APPROVAL",
    NEGOTIATION: "NEGOTIATION",
    FULFILLMENT: "FULFILLMENT",
    BILLING: "BILLING",
} as const;
export type DealRiskFactorType =
    (typeof DealRiskFactorType)[keyof typeof DealRiskFactorType];

export const DealRiskSeverity = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const;
export type DealRiskSeverity =
    (typeof DealRiskSeverity)[keyof typeof DealRiskSeverity];

export const BASE_DEAL_HEALTH_SCORE = 100;

export const HEALTH_SCORE_THRESHOLDS = {
    HEALTHY_MIN: 80,
    WATCH_MIN: 60,
    AT_RISK_MIN: 40,
} as const;

export const SEVERITY_THRESHOLDS = {
    LOW_MAX: 9,
    MEDIUM_MAX: 19,
    HIGH_MAX: 29,
} as const;

/**
 * Headroom in percentage points below effective discount ceiling
 * that classifies a within-limit discount as "NEAR_LIMIT".
 */
export const DISCOUNT_NEAR_LIMIT_HEADROOM_PERCENT = 2.0;

export const DISCOUNT_PENALTIES = {
    NONE: 0,
    NEAR_LIMIT: 10,
    APPROVAL_REQUIRED: 15,
    FINANCE_APPROVAL_REQUIRED: 25,
    REJECTED: 40,
} as const;

export const MARGIN_PENALTIES = {
    TIER_1_HIGH: 0, // >= 30%
    TIER_2_HEALTHY: 10, // 20–29.99%
    TIER_3_MODERATE: 20, // 10–19.99%
    TIER_4_LOW: 30, // 0–9.99%
    TIER_5_NEGATIVE: 40, // < 0%
} as const;

export const APPROVAL_PENALTIES = {
    NONE: 0,
    PENDING_SALES_MANAGER: 10,
    PENDING_FINANCE_OPERATIONS: 20,
    REJECTED: 30,
} as const;

export const NEGOTIATION_PENALTIES = {
    NONE: 0,
    ACTIVE: 10,
    ONE_PENDING_CR: 15,
    MULTIPLE_PENDING_CR: 20,
} as const;

export const FULFILLMENT_PENALTIES = {
    NONE: 0,
    PENDING: 5,
    PARTIALLY_ALLOCATED: 15,
    SHORTAGE: 25,
    ALLOCATED: 0,
    FULFILLED: 0,
} as const;

export const BILLING_PENALTIES = {
    NONE: 0,
    PAID: 0,
    PENDING: 10,
} as const;
