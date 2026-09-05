import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "@/server/modules/discount-governance/discount-governance.constants";
import type { CanonicalLineEvaluationResult } from "@/server/modules/discount-governance/discount-governance.types";
import type { QuotationEvaluationResponse, QuotationSummaryResponse } from "./quotation.types";

export function roundToTwo(value: number): number {
    return Number(value.toFixed(2));
}

export interface CalculateLineCommercialsParams {
    quantity: number;
    unitPrice: number;
    unitCost: number;
    discountPercent: number;
}

export interface LineCommercialsResult {
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
    margin: number;
    marginPercent: number;
}

export function calculateLineCommercials(
    params: CalculateLineCommercialsParams,
): LineCommercialsResult {
    const { quantity, unitPrice, unitCost, discountPercent } = params;

    const lineSubtotal = roundToTwo(quantity * unitPrice);
    const lineDiscount = roundToTwo((lineSubtotal * discountPercent) / 100);
    const lineTotal = roundToTwo(lineSubtotal - lineDiscount);
    const lineCost = roundToTwo(quantity * unitCost);
    const margin = roundToTwo(lineTotal - lineCost);
    const marginPercent = lineTotal > 0 ? roundToTwo((margin / lineTotal) * 100) : 0;

    return {
        lineSubtotal,
        lineDiscount,
        lineTotal,
        margin,
        marginPercent,
    };
}

export interface SummaryLineItem {
    quantity: number;
    unitCost: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
}

export function calculateQuotationSummary(
    lines: SummaryLineItem[],
    orderDiscountPercent: number,
): QuotationSummaryResponse {
    let subtotal = 0;
    let lineDiscountTotal = 0;
    let totalCost = 0;

    for (const line of lines) {
        subtotal += line.lineSubtotal;
        lineDiscountTotal += line.lineDiscount;
        totalCost += line.quantity * line.unitCost;
    }

    subtotal = roundToTwo(subtotal);
    lineDiscountTotal = roundToTwo(lineDiscountTotal);
    totalCost = roundToTwo(totalCost);

    const amountAfterLineDiscounts = roundToTwo(subtotal - lineDiscountTotal);
    const orderDiscount = roundToTwo(
        (amountAfterLineDiscounts * orderDiscountPercent) / 100,
    );
    const total = roundToTwo(amountAfterLineDiscounts - orderDiscount);
    const margin = roundToTwo(total - totalCost);
    const marginPercent = total > 0 ? roundToTwo((margin / total) * 100) : 0;

    return {
        subtotal,
        lineDiscountTotal,
        orderDiscount,
        total,
        margin,
        marginPercent,
    };
}

/**
 * Deterministically calculates the blended risk score (0 to 100) based on
 * complete quotation metrics: blended discount percentage and total margin percentage.
 */
export function calculateBlendedRiskScore(
    approvalLevel: DiscountApprovalLevel,
    status: EvaluationStatus,
    blendedDiscountPercent: number,
    marginPercent: number,
): number {
    if (status === EvaluationStatus.REJECTED) {
        return 100;
    }

    if (approvalLevel === DiscountApprovalLevel.NONE) {
        return 0;
    }

    // Risk factors: discount depth and low margin exposure
    const discountFactor = blendedDiscountPercent / 2;
    const marginRiskFactor = (100 - marginPercent) / 10;

    if (approvalLevel === DiscountApprovalLevel.SALES_MANAGER) {
        const rawScore = Math.round(30 + discountFactor + marginRiskFactor);
        return Math.min(59, Math.max(30, rawScore));
    }

    // FINANCE_OPERATIONS
    const rawScore = Math.round(60 + discountFactor + marginRiskFactor);
    return Math.min(95, Math.max(60, rawScore));
}

export interface EvaluateQuotationGovernanceParams {
    lineEvaluations: CanonicalLineEvaluationResult[];
    orderDiscountPercent: number;
    customerTierLimit: number | null;
    salesManagerThreshold: number;
    financeOperationsThreshold: number;
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscount: number;
    marginPercent: number;
}

export function evaluateQuotationGovernance(
    params: EvaluateQuotationGovernanceParams,
): QuotationEvaluationResponse {
    const {
        lineEvaluations,
        orderDiscountPercent,
        customerTierLimit,
        salesManagerThreshold,
        financeOperationsThreshold,
        subtotal,
        lineDiscountTotal,
        orderDiscount,
        marginPercent,
    } = params;

    const totalDiscountAmount = lineDiscountTotal + orderDiscount;
    const blendedDiscountPercent =
        subtotal > 0 ? roundToTwo((totalDiscountAmount / subtotal) * 100) : 0;

    // 1. Overall customer tier ceiling check
    if (customerTierLimit !== null && blendedDiscountPercent > customerTierLimit) {
        return {
            status: EvaluationStatus.REJECTED,
            approvalLevel: DiscountApprovalLevel.NONE,
            blendedRiskScore: 100,
            message: `Blended discount of ${blendedDiscountPercent}% exceeds customer tier maximum permitted discount of ${customerTierLimit}%.`,
        };
    }

    // 2. Individual line ceiling check
    const hasRejectedLine = lineEvaluations.some(
        (line) => line.status === EvaluationStatus.REJECTED,
    );
    if (hasRejectedLine) {
        return {
            status: EvaluationStatus.REJECTED,
            approvalLevel: DiscountApprovalLevel.NONE,
            blendedRiskScore: 100,
            message: "One or more quotation lines exceed commercial discount ceiling.",
        };
    }

    // 3. Multi-level approval routing
    let requiresFinanceOps = false;
    let requiresSalesManager = false;

    // Check lines
    for (const line of lineEvaluations) {
        if (line.approvalLevel === DiscountApprovalLevel.FINANCE_OPERATIONS) {
            requiresFinanceOps = true;
        } else if (line.approvalLevel === DiscountApprovalLevel.SALES_MANAGER) {
            requiresSalesManager = true;
        }
    }

    // Check order-level discount
    if (orderDiscountPercent > financeOperationsThreshold) {
        requiresFinanceOps = true;
    } else if (orderDiscountPercent > salesManagerThreshold) {
        requiresSalesManager = true;
    }

    // Check blended discount against thresholds
    if (blendedDiscountPercent > financeOperationsThreshold) {
        requiresFinanceOps = true;
    } else if (blendedDiscountPercent > salesManagerThreshold) {
        requiresSalesManager = true;
    }

    let status: EvaluationStatus;
    let approvalLevel: DiscountApprovalLevel;
    let message: string | null = null;

    if (requiresFinanceOps) {
        status = EvaluationStatus.APPROVAL_REQUIRED;
        approvalLevel = DiscountApprovalLevel.FINANCE_OPERATIONS;
        message = "Quotation requires Sales Manager and Finance Operations approval.";
    } else if (requiresSalesManager) {
        status = EvaluationStatus.APPROVAL_REQUIRED;
        approvalLevel = DiscountApprovalLevel.SALES_MANAGER;
        message = "Quotation requires Sales Manager approval.";
    } else {
        status = EvaluationStatus.WITHIN_LIMIT;
        approvalLevel = DiscountApprovalLevel.NONE;
        message = null;
    }

    const blendedRiskScore = calculateBlendedRiskScore(
        approvalLevel,
        status,
        blendedDiscountPercent,
        marginPercent,
    );

    return {
        status,
        approvalLevel,
        blendedRiskScore,
        message,
    };
}
