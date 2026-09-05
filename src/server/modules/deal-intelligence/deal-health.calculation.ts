import {
    BASE_DEAL_HEALTH_SCORE,
    DealHealthStatus,
    DealRiskFactorType,
    DealRiskSeverity,
    DISCOUNT_PENALTIES,
    FULFILLMENT_PENALTIES,
    HEALTH_SCORE_THRESHOLDS,
    MARGIN_PENALTIES,
    NEGOTIATION_PENALTIES,
    SEVERITY_THRESHOLDS,
    APPROVAL_PENALTIES,
    BILLING_PENALTIES,
} from "./deal-intelligence.constants";
import type {
    ApprovalRiskSignal,
    BillingRiskSignal,
    DealHealthCalculatorInput,
    DealHealthResult,
    DealRiskFactor,
    DiscountRiskSignal,
    FulfillmentRiskSignal,
    NegotiationRiskSignal,
} from "./deal-intelligence.types";

/**
 * Maps a numeric impact score to a standardized risk severity band.
 * 0–9   -> LOW
 * 10–19 -> MEDIUM
 * 20–29 -> HIGH
 * 30+   -> CRITICAL
 */
export function getSeverityForImpact(impact: number): DealRiskSeverity {
    if (impact <= SEVERITY_THRESHOLDS.LOW_MAX) {
        return DealRiskSeverity.LOW;
    }
    if (impact <= SEVERITY_THRESHOLDS.MEDIUM_MAX) {
        return DealRiskSeverity.MEDIUM;
    }
    if (impact <= SEVERITY_THRESHOLDS.HIGH_MAX) {
        return DealRiskSeverity.HIGH;
    }
    return DealRiskSeverity.CRITICAL;
}

/**
 * Maps a final deal health score (0–100) to a DealHealthStatus.
 * 80–100 -> HEALTHY
 * 60–79  -> WATCH
 * 40–59  -> AT_RISK
 * 0–39   -> CRITICAL
 */
export function getStatusForScore(score: number): DealHealthStatus {
    if (score >= HEALTH_SCORE_THRESHOLDS.HEALTHY_MIN) {
        return DealHealthStatus.HEALTHY;
    }
    if (score >= HEALTH_SCORE_THRESHOLDS.WATCH_MIN) {
        return DealHealthStatus.WATCH;
    }
    if (score >= HEALTH_SCORE_THRESHOLDS.AT_RISK_MIN) {
        return DealHealthStatus.AT_RISK;
    }
    return DealHealthStatus.CRITICAL;
}

/**
 * Calculates discount penalty based on aggregated discount governance signal.
 * Returns null if no discount risk factor applies.
 */
export function calculateDiscountPenalty(
    signal: DiscountRiskSignal | string,
): DealRiskFactor | null {
    const normalized = signal.trim().toUpperCase().replace(/\s+/g, "_");

    if (normalized === "REJECTED") {
        const impact = DISCOUNT_PENALTIES.REJECTED;
        return {
            type: DealRiskFactorType.DISCOUNT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Discount exceeds commercial ceiling and was rejected.",
        };
    }

    if (
        normalized === "FINANCE_APPROVAL_REQUIRED" ||
        normalized === "FINANCE_APPROVAL"
    ) {
        const impact = DISCOUNT_PENALTIES.FINANCE_APPROVAL_REQUIRED;
        return {
            type: DealRiskFactorType.DISCOUNT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Discount requires Finance Operations approval.",
        };
    }

    if (
        normalized === "APPROVAL_REQUIRED" ||
        normalized === "APPROVAL" ||
        normalized === "SALES_MANAGER_APPROVAL"
    ) {
        const impact = DISCOUNT_PENALTIES.APPROVAL_REQUIRED;
        return {
            type: DealRiskFactorType.DISCOUNT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Discount requires Sales Manager approval.",
        };
    }

    if (normalized === "NEAR_LIMIT") {
        const impact = DISCOUNT_PENALTIES.NEAR_LIMIT;
        return {
            type: DealRiskFactorType.DISCOUNT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Discount is near the maximum permitted governance ceiling.",
        };
    }

    return null;
}

/**
 * Calculates margin penalty based on authoritative margin percentage.
 * >= 30%    -> 0
 * 20–29.99% -> 10
 * 10–19.99% -> 20
 * 0–9.99%   -> 30
 * < 0%      -> 40
 */
export function calculateMarginPenalty(
    marginPercent: number,
): DealRiskFactor | null {
    if (marginPercent < 0) {
        const impact = MARGIN_PENALTIES.TIER_5_NEGATIVE;
        return {
            type: DealRiskFactorType.MARGIN,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Deal margin is negative.",
        };
    }

    if (marginPercent < 10) {
        const impact = MARGIN_PENALTIES.TIER_4_LOW;
        return {
            type: DealRiskFactorType.MARGIN,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Deal margin is dangerously low (below 10%).",
        };
    }

    if (marginPercent < 20) {
        const impact = MARGIN_PENALTIES.TIER_3_MODERATE;
        return {
            type: DealRiskFactorType.MARGIN,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Deal margin is below 20%.",
        };
    }

    if (marginPercent < 30) {
        const impact = MARGIN_PENALTIES.TIER_2_HEALTHY;
        return {
            type: DealRiskFactorType.MARGIN,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Deal margin is moderate (between 20% and 29.99%).",
        };
    }

    return null;
}

/**
 * Calculates approval penalty based on actionable approval workflow status.
 * None/Approved                -> 0
 * Pending Sales Manager        -> 10
 * Pending Finance Operations   -> 20
 * Rejected                     -> 30
 */
export function calculateApprovalPenalty(
    signal: ApprovalRiskSignal | string,
): DealRiskFactor | null {
    const normalized = signal.trim().toUpperCase().replace(/\s+/g, "_");

    if (normalized === "REJECTED") {
        const impact = APPROVAL_PENALTIES.REJECTED;
        return {
            type: DealRiskFactorType.APPROVAL,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Quotation approval was rejected.",
        };
    }

    if (
        normalized === "PENDING_FINANCE_OPERATIONS" ||
        normalized === "FINANCE_OPERATIONS_PENDING"
    ) {
        const impact = APPROVAL_PENALTIES.PENDING_FINANCE_OPERATIONS;
        return {
            type: DealRiskFactorType.APPROVAL,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Quotation requires pending Finance Operations approval.",
        };
    }

    if (
        normalized === "PENDING_SALES_MANAGER" ||
        normalized === "SALES_MANAGER_PENDING"
    ) {
        const impact = APPROVAL_PENALTIES.PENDING_SALES_MANAGER;
        return {
            type: DealRiskFactorType.APPROVAL,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Quotation requires pending Sales Manager approval.",
        };
    }

    return null;
}

/**
 * Calculates negotiation penalty with strict precedence:
 * Multiple pending CRs (20) > One pending CR (15) > Active negotiation (10) > None (0)
 */
export function calculateNegotiationPenalty(
    signal: NegotiationRiskSignal | string,
): DealRiskFactor | null {
    const normalized = signal.trim().toUpperCase().replace(/\s+/g, "_");

    if (
        normalized === "MULTIPLE_PENDING_CR" ||
        normalized === "MULTIPLE_PENDING_REQUESTS"
    ) {
        const impact = NEGOTIATION_PENALTIES.MULTIPLE_PENDING_CR;
        return {
            type: DealRiskFactorType.NEGOTIATION,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Customer has multiple pending change requests.",
        };
    }

    if (
        normalized === "ONE_PENDING_CR" ||
        normalized === "ONE_PENDING_REQUEST"
    ) {
        const impact = NEGOTIATION_PENALTIES.ONE_PENDING_CR;
        return {
            type: DealRiskFactorType.NEGOTIATION,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Customer has 1 pending change request.",
        };
    }

    if (normalized === "ACTIVE") {
        const impact = NEGOTIATION_PENALTIES.ACTIVE;
        return {
            type: DealRiskFactorType.NEGOTIATION,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Deal is currently under negotiation.",
        };
    }

    return null;
}

/**
 * Calculates fulfillment penalty with strict precedence:
 * Shortage (25) > Partially Allocated (15) > Pending (5) > Allocated/Fulfilled/None (0)
 */
export function calculateFulfillmentPenalty(
    signal: FulfillmentRiskSignal | string,
): DealRiskFactor | null {
    const normalized = signal.trim().toUpperCase().replace(/\s+/g, "_");

    if (normalized === "SHORTAGE" || normalized === "ALLOCATION_SHORTAGE") {
        const impact = FULFILLMENT_PENALTIES.SHORTAGE;
        return {
            type: DealRiskFactorType.FULFILLMENT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Inventory shortage prevents full fulfillment allocation.",
        };
    }

    if (normalized === "PARTIALLY_ALLOCATED") {
        const impact = FULFILLMENT_PENALTIES.PARTIALLY_ALLOCATED;
        return {
            type: DealRiskFactorType.FULFILLMENT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Fulfillment is only partially allocated across warehouses.",
        };
    }

    if (normalized === "PENDING") {
        const impact = FULFILLMENT_PENALTIES.PENDING;
        return {
            type: DealRiskFactorType.FULFILLMENT,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Fulfillment is pending inventory allocation.",
        };
    }

    return null;
}

/**
 * Calculates billing penalty based on invoice status:
 * Pending (10) > Paid/None (0)
 */
export function calculateBillingPenalty(
    signal: BillingRiskSignal | string,
): DealRiskFactor | null {
    const normalized = signal.trim().toUpperCase().replace(/\s+/g, "_");

    if (normalized === "PENDING") {
        const impact = BILLING_PENALTIES.PENDING;
        return {
            type: DealRiskFactorType.BILLING,
            severity: getSeverityForImpact(impact),
            impact,
            message: "Invoice payment is pending.",
        };
    }

    return null;
}

/**
 * Pure, deterministic Deal Health Calculation engine.
 * Receives already-normalized facts, evaluates penalties across dimensions,
 * compounds non-zero factors, and computes the clamped final score and status.
 */
export function calculateDealHealth(
    input: DealHealthCalculatorInput,
): DealHealthResult {
    const candidateFactors = [
        calculateDiscountPenalty(input.discountSignal),
        calculateMarginPenalty(input.marginPercent),
        calculateApprovalPenalty(input.approvalSignal),
        calculateNegotiationPenalty(input.negotiationSignal),
        calculateFulfillmentPenalty(input.fulfillmentSignal),
        calculateBillingPenalty(input.billingSignal),
    ];

    // Collect all applicable non-zero factors
    const factors: DealRiskFactor[] = candidateFactors.filter(
        (f): f is DealRiskFactor => f !== null && f.impact > 0,
    );

    const totalPenalties = factors.reduce((sum, f) => sum + f.impact, 0);
    const score = Math.max(
        0,
        Math.min(BASE_DEAL_HEALTH_SCORE, BASE_DEAL_HEALTH_SCORE - totalPenalties),
    );
    const status = getStatusForScore(score);

    return {
        score,
        status,
        factors,
    };
}
