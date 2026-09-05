import { CustomerTier } from "@prisma/client";
import {
    DiscountApprovalLevel,
    EvaluationStatus,
} from "./discount-governance.constants";

export interface DiscountLineContext {
    lineId: number;
    customerTier: CustomerTier;
    productCategory: string;
    discountPercent: number;
}

export interface NormalizedDiscountGovernanceRules {
    customerTierLimit: number | null;
    categoryLimit: number | null;
    salesManagerThreshold: number;
    financeOperationsThreshold: number;
}

export interface CanonicalLineEvaluationResult {
    lineId: number;
    status: EvaluationStatus;
    approvalLevel: DiscountApprovalLevel;
    effectiveLimit: number;
    message: string | null;
}

export interface EvaluateLineItemInput {
    lineId: number;
    productId: string;
    variantId?: string;
    quantity: number;
    discountPercent: number;
}

export interface EvaluateLineInput {
    customerTier: CustomerTier;
    line: EvaluateLineItemInput;
}

export interface DiscountTierRuleResponse {
    id: string;
    customerTier: CustomerTier;
    maximumDiscountPercent: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DiscountCategoryRuleResponse {
    id: string;
    category: string;
    maximumDiscountPercent: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DiscountApprovalPolicyResponse {
    id: string;
    salesManagerThreshold: number;
    financeOperationsThreshold: number;
    updatedAt: string;
}

export interface DiscountRuleArchiveResponse {
    message: string;
}

export interface CreateTierRuleInput {
    customerTier: CustomerTier;
    maximumDiscountPercent: number;
}

export interface UpdateTierRuleInput {
    maximumDiscountPercent?: number;
    isActive?: boolean;
}

export interface CreateCategoryRuleInput {
    category: string;
    maximumDiscountPercent: number;
}

export interface UpdateCategoryRuleInput {
    maximumDiscountPercent?: number;
    isActive?: boolean;
}

export interface UpdateApprovalPolicyInput {
    salesManagerThreshold: number;
    financeOperationsThreshold: number;
}

export interface ListRulesQuery {
    isActive?: boolean;
}
