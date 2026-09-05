import {
    ApprovalRequest,
    ApprovalStep,
    ApprovalStepLevel,
    ApprovalStepStatus,
    ApprovalRequestStatus,
    QuotationRevisionStatus,
    QuotationStatus,
    UserRole,
} from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import {
    APPROVAL_READ_ROLES,
    APPROVAL_STEP_ORDER,
    FINANCE_OPERATIONS_STEP_ROLES,
    SALES_MANAGER_STEP_ROLES,
} from "./approval.constants";
import type {
    ApprovalRequestResponse,
    ApproveStepInput,
    QuotationApprovalHistoryResponse,
    RejectStepInput,
} from "./approval.types";

export class ApprovalService {
    // ==========================================
    // Internal Helper: Map DB entity to DTO
    // ==========================================
    private mapApprovalRequestToResponse(
        request: ApprovalRequest & {
            revision?: { revisionNumber: number } | null;
            steps: (ApprovalStep & {
                decidedBy?: {
                    id: string;
                    name: string;
                    email?: string;
                    role?: string;
                } | null;
            })[];
        },
    ): ApprovalRequestResponse {
        const orderedSteps = [...request.steps].sort((a, b) => {
            const orderA = APPROVAL_STEP_ORDER.indexOf(a.level);
            const orderB = APPROVAL_STEP_ORDER.indexOf(b.level);
            if (orderA !== orderB) return orderA - orderB;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });

        return {
            id: request.id,
            approvalRequestId: request.id,
            quotationId: request.quotationId,
            revisionId: request.revisionId,
            revisionNumber: request.revision?.revisionNumber,
            status: request.status,
            steps: orderedSteps.map((step) => ({
                id: step.id,
                approvalRequestId: step.approvalRequestId,
                level: step.level,
                status: step.status,
                decidedBy: step.decidedBy
                    ? {
                          id: step.decidedBy.id,
                          name: step.decidedBy.name,
                          email: step.decidedBy.email,
                          role: step.decidedBy.role,
                      }
                    : null,
                decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
                reason: step.reason ?? null,
                createdAt: step.createdAt.toISOString(),
                updatedAt: step.updatedAt.toISOString(),
            })),
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
        };
    }

    // ==========================================
    // 1. Get Quotation Approval History (Read-Only)
    // ==========================================
    async getQuotationApprovalHistory(
        user: AuthenticatedUser,
        quotationId: string,
    ): Promise<QuotationApprovalHistoryResponse> {
        if (!APPROVAL_READ_ROLES.includes(user.role)) {
            throw new ForbiddenError(
                "You are not authorized to view approval history.",
            );
        }

        const quotation = await prisma.quotation.findFirst({
            where: {
                id: quotationId,
                organizationId: user.organizationId,
            },
            select: { id: true },
        });

        if (!quotation) {
            throw new NotFoundError("Quotation not found.");
        }

        const approvalRequests = await prisma.approvalRequest.findMany({
            where: {
                quotationId: quotation.id,
            },
            include: {
                revision: {
                    select: { revisionNumber: true },
                },
                steps: {
                    include: {
                        decidedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return {
            quotationId: quotation.id,
            approvalRequests: approvalRequests.map((req) =>
                this.mapApprovalRequestToResponse(req),
            ),
        };
    }

    // ==========================================
    // 2. Approve Actionable Step
    // ==========================================
    async approveStep(
        user: AuthenticatedUser,
        approvalRequestId: string,
        input: ApproveStepInput,
    ): Promise<ApprovalRequestResponse> {
        return prisma.$transaction(async (tx) => {
            const approvalRequest = await tx.approvalRequest.findFirst({
                where: {
                    id: approvalRequestId,
                    quotation: { organizationId: user.organizationId },
                },
                include: {
                    steps: true,
                },
            });

            if (!approvalRequest) {
                throw new NotFoundError("Approval request not found.");
            }

            if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
                throw new BadRequestError(
                    "This approval request has already been finalized.",
                );
            }

            // Order steps sequentially: SALES_MANAGER -> FINANCE_OPERATIONS
            const orderedSteps = [...approvalRequest.steps].sort((a, b) => {
                const orderA = APPROVAL_STEP_ORDER.indexOf(a.level);
                const orderB = APPROVAL_STEP_ORDER.indexOf(b.level);
                return orderA - orderB;
            });

            const actionableStep = orderedSteps.find(
                (s) => s.status === ApprovalStepStatus.PENDING,
            );

            if (!actionableStep) {
                throw new BadRequestError("No pending approval steps found.");
            }

            // Enforce sequential hierarchy and role authorization
            if (actionableStep.level === ApprovalStepLevel.SALES_MANAGER) {
                if (!SALES_MANAGER_STEP_ROLES.includes(user.role)) {
                    throw new ForbiddenError(
                        "Only a Sales Manager or Admin can approve this step.",
                    );
                }
            } else if (
                actionableStep.level === ApprovalStepLevel.FINANCE_OPERATIONS
            ) {
                const smStep = orderedSteps.find(
                    (s) => s.level === ApprovalStepLevel.SALES_MANAGER,
                );
                if (!smStep || smStep.status !== ApprovalStepStatus.APPROVED) {
                    throw new BadRequestError(
                        "Sales Manager step must be approved before Finance Operations step.",
                    );
                }

                if (!FINANCE_OPERATIONS_STEP_ROLES.includes(user.role)) {
                    throw new ForbiddenError(
                        "Only Finance Operations or Admin can approve this step.",
                    );
                }
            }

            // Race-safe optimistic update on the actionable step
            const now = new Date();
            const updateResult = await tx.approvalStep.updateMany({
                where: {
                    id: actionableStep.id,
                    status: ApprovalStepStatus.PENDING,
                },
                data: {
                    status: ApprovalStepStatus.APPROVED,
                    decidedById: user.id,
                    decidedAt: now,
                    reason: input.reason ?? null,
                },
            });

            if (updateResult.count === 0) {
                throw new ConflictError(
                    "This approval step has already been decided by another request.",
                );
            }

            // Check if all steps in this approval request are now approved
            const remainingPendingSteps = orderedSteps.filter(
                (s) =>
                    s.id !== actionableStep.id &&
                    s.status === ApprovalStepStatus.PENDING,
            );

            if (remainingPendingSteps.length === 0) {
                // Workflow fully approved
                await tx.approvalRequest.update({
                    where: { id: approvalRequest.id },
                    data: { status: ApprovalRequestStatus.APPROVED },
                });

                await tx.quotation.update({
                    where: { id: approvalRequest.quotationId },
                    data: { status: QuotationStatus.APPROVED },
                });

                await tx.quotationRevision.update({
                    where: { id: approvalRequest.revisionId },
                    data: { status: QuotationRevisionStatus.APPROVED },
                });
            }

            // Fetch and return the fresh updated request state
            const updatedRequest = await tx.approvalRequest.findUniqueOrThrow({
                where: { id: approvalRequest.id },
                include: {
                    revision: {
                        select: { revisionNumber: true },
                    },
                    steps: {
                        include: {
                            decidedBy: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    role: true,
                                },
                            },
                        },
                    },
                },
            });

            return this.mapApprovalRequestToResponse(updatedRequest);
        });
    }

    // ==========================================
    // 3. Reject Actionable Step
    // ==========================================
    async rejectStep(
        user: AuthenticatedUser,
        approvalRequestId: string,
        input: RejectStepInput,
    ): Promise<ApprovalRequestResponse> {
        return prisma.$transaction(async (tx) => {
            const approvalRequest = await tx.approvalRequest.findFirst({
                where: {
                    id: approvalRequestId,
                    quotation: { organizationId: user.organizationId },
                },
                include: {
                    steps: true,
                },
            });

            if (!approvalRequest) {
                throw new NotFoundError("Approval request not found.");
            }

            if (approvalRequest.status !== ApprovalRequestStatus.PENDING) {
                throw new BadRequestError(
                    "This approval request has already been finalized.",
                );
            }

            if (!input.reason || input.reason.trim().length === 0) {
                throw new BadRequestError(
                    "Reason is required for rejection.",
                );
            }

            // Order steps sequentially: SALES_MANAGER -> FINANCE_OPERATIONS
            const orderedSteps = [...approvalRequest.steps].sort((a, b) => {
                const orderA = APPROVAL_STEP_ORDER.indexOf(a.level);
                const orderB = APPROVAL_STEP_ORDER.indexOf(b.level);
                return orderA - orderB;
            });

            const actionableStep = orderedSteps.find(
                (s) => s.status === ApprovalStepStatus.PENDING,
            );

            if (!actionableStep) {
                throw new BadRequestError("No pending approval steps found.");
            }

            // Enforce sequential hierarchy and role authorization
            if (actionableStep.level === ApprovalStepLevel.SALES_MANAGER) {
                if (!SALES_MANAGER_STEP_ROLES.includes(user.role)) {
                    throw new ForbiddenError(
                        "Only a Sales Manager or Admin can reject this step.",
                    );
                }
            } else if (
                actionableStep.level === ApprovalStepLevel.FINANCE_OPERATIONS
            ) {
                const smStep = orderedSteps.find(
                    (s) => s.level === ApprovalStepLevel.SALES_MANAGER,
                );
                if (!smStep || smStep.status !== ApprovalStepStatus.APPROVED) {
                    throw new BadRequestError(
                        "Sales Manager step must be approved before Finance Operations step.",
                    );
                }

                if (!FINANCE_OPERATIONS_STEP_ROLES.includes(user.role)) {
                    throw new ForbiddenError(
                        "Only Finance Operations or Admin can reject this step.",
                    );
                }
            }

            // Race-safe optimistic update on the actionable step
            const now = new Date();
            const updateResult = await tx.approvalStep.updateMany({
                where: {
                    id: actionableStep.id,
                    status: ApprovalStepStatus.PENDING,
                },
                data: {
                    status: ApprovalStepStatus.REJECTED,
                    decidedById: user.id,
                    decidedAt: now,
                    reason: input.reason.trim(),
                },
            });

            if (updateResult.count === 0) {
                throw new ConflictError(
                    "This approval step has already been decided by another request.",
                );
            }

            // Rejection is TERMINAL: immediately mark request, quotation, and revision as REJECTED
            await tx.approvalRequest.update({
                where: { id: approvalRequest.id },
                data: { status: ApprovalRequestStatus.REJECTED },
            });

            await tx.quotation.update({
                where: { id: approvalRequest.quotationId },
                data: { status: QuotationStatus.REJECTED },
            });

            await tx.quotationRevision.update({
                where: { id: approvalRequest.revisionId },
                data: { status: QuotationRevisionStatus.REJECTED },
            });

            // Fetch and return the fresh updated request state
            const updatedRequest = await tx.approvalRequest.findUniqueOrThrow({
                where: { id: approvalRequest.id },
                include: {
                    revision: {
                        select: { revisionNumber: true },
                    },
                    steps: {
                        include: {
                            decidedBy: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    role: true,
                                },
                            },
                        },
                    },
                },
            });

            return this.mapApprovalRequestToResponse(updatedRequest);
        });
    }
}

export const approvalService = new ApprovalService();
