import type {
    DealRiskFactorType,
    DealRiskSeverity,
} from "@/server/modules/deal-intelligence/deal-intelligence.types";

export interface DealKeyRisk {
    factor: DealRiskFactorType;
    severity: DealRiskSeverity;
    explanation: string;
}

export interface DealRecommendedAction {
    priority: number;
    action: string;
    reason: string;
}

export interface DealRiskExplanation {
    summary: string;
    keyRisks: DealKeyRisk[];
    recommendedActions: DealRecommendedAction[];
}
