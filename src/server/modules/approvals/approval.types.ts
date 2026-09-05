import {
    ApprovalRequestStatus,
    ApprovalStepLevel,
    ApprovalStepStatus,
} from "@prisma/client";

export interface ApprovalDecisionMakerResponse {
    id: string;
    name: string;
    email?: string;
    role?: string;
}

export interface ApprovalStepResponse {
    id: string;
    approvalRequestId: string;
    level: ApprovalStepLevel;
    status: ApprovalStepStatus;
    decidedBy: ApprovalDecisionMakerResponse | null;
    decidedAt: string | null;
    reason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ApprovalRequestResponse {
    id: string;
    approvalRequestId: string;
    quotationId: string;
    revisionId: string;
    revisionNumber?: number;
    status: ApprovalRequestStatus;
    steps: ApprovalStepResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface ApproveStepInput {
    reason?: string;
}

export interface RejectStepInput {
    reason: string;
}

export interface QuotationApprovalHistoryResponse {
    quotationId: string;
    approvalRequests: ApprovalRequestResponse[];
}
