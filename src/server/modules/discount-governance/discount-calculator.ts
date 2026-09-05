import { BadRequestError } from "@/server/shared/errors/errors";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "./discount-governance.constants";
import type {
    CanonicalLineEvaluationResult,
    DiscountLineContext,
    NormalizedDiscountGovernanceRules,
} from "./discount-governance.types";

/**
 * Pure, deterministic discount evaluation engine.
 * Decoupled from database, HTTP, session, and external side effects.
 *
 * Rules:
 * 1. Effective Limit = MIN(all applicable active limits: customer tier, product category).
 *    If neither rule is present, an explicit BadRequestError is thrown.
 * 2. Commercial Ceiling Check (Precedence):
 *    If discountPercent > effectiveLimit -> REJECTED (approvalLevel: NONE).
 * 3. Multi-tier Approval Routing (when discountPercent <= effectiveLimit):
 *    - <= salesManagerThreshold -> WITHIN_LIMIT (approvalLevel: NONE, message: null)
 *    - > salesManagerThreshold && <= financeOperationsThreshold -> APPROVAL_REQUIRED (approvalLevel: SALES_MANAGER)
 *    - > financeOperationsThreshold -> APPROVAL_REQUIRED (approvalLevel: FINANCE_OPERATIONS)
 */
export function evaluateLineDiscount(
    context: DiscountLineContext,
    rules: NormalizedDiscountGovernanceRules,
): CanonicalLineEvaluationResult {
    const { lineId, discountPercent } = context;

    // 1. Determine effective discount ceiling
    if (rules.customerTierLimit === null && rules.categoryLimit === null) {
        throw new BadRequestError(
            "No discount governance rules configured for this customer tier or product category.",
        );
    }

    let effectiveLimit: number;
    if (rules.customerTierLimit !== null && rules.categoryLimit !== null) {
        effectiveLimit = Math.min(
            rules.customerTierLimit,
            rules.categoryLimit,
        );
    } else if (rules.customerTierLimit !== null) {
        effectiveLimit = rules.customerTierLimit;
    } else {
        effectiveLimit = rules.categoryLimit as number;
    }

    // 2. Ceiling violation strictly takes precedence over approval routing
    if (discountPercent > effectiveLimit) {
        return {
            lineId,
            status: EvaluationStatus.REJECTED,
            approvalLevel: DiscountApprovalLevel.NONE,
            effectiveLimit,
            message: `Discount exceeds the maximum permitted discount of ${effectiveLimit}%.`,
        };
    }

    // 3. Approval threshold routing
    if (discountPercent <= rules.salesManagerThreshold) {
        return {
            lineId,
            status: EvaluationStatus.WITHIN_LIMIT,
            approvalLevel: DiscountApprovalLevel.NONE,
            effectiveLimit,
            message: null,
        };
    }

    if (discountPercent <= rules.financeOperationsThreshold) {
        return {
            lineId,
            status: EvaluationStatus.APPROVAL_REQUIRED,
            approvalLevel: DiscountApprovalLevel.SALES_MANAGER,
            effectiveLimit,
            message: "Discount requires Sales Manager approval.",
        };
    }

    return {
        lineId,
        status: EvaluationStatus.APPROVAL_REQUIRED,
        approvalLevel: DiscountApprovalLevel.FINANCE_OPERATIONS,
        effectiveLimit,
        message: "Discount requires Sales Manager and Finance Operations approval.",
    };
}
