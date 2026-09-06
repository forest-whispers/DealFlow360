"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APPROVAL_LEVEL_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters";
import { CheckCircle2, Clock, GitCommit, XCircle, ArrowDown } from "lucide-react";
import type { ApprovalStepResponse } from "@/server/modules/approvals/approval.types";

export interface ApprovalChainProps {
    steps: ApprovalStepResponse[];
    activeStepId?: string | null;
}

export function ApprovalChain({ steps, activeStepId }: ApprovalChainProps) {
    if (!steps || steps.length === 0) {
        return (
            <Card className="border-[#E2E8F0]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <GitCommit className="w-4 h-4 text-[#64748B]" />
                        Approval Workflow
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-[12px] text-[#64748B] italic pt-1">
                    No approval steps configured for this revision.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#E2E8F0]">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GitCommit className="w-4 h-4 text-[#1E40AF]" />
                        <span>Approval Chain</span>
                    </div>
                    <span className="text-[11px] font-normal text-[#64748B]">
                        {steps.length} {steps.length === 1 ? "Step" : "Steps"}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    const levelLabel =
                        APPROVAL_LEVEL_META[step.level]?.label || step.level;
                    const isActionable = activeStepId === step.id;

                    const isApproved = step.status === "APPROVED";
                    const isRejected = step.status === "REJECTED";
                    const isPending = step.status === "PENDING";

                    return (
                        <div key={step.id} className="relative">
                            <div
                                className={`p-3 rounded-lg border transition-colors ${
                                    isActionable
                                        ? "bg-[#FEFCE8] border-[#FEF08A]"
                                        : isApproved
                                        ? "bg-[#F0FDF4] border-[#DCFCE7]"
                                        : isRejected
                                        ? "bg-[#FEF2F2] border-[#FEE2E2]"
                                        : "bg-[#F8FAFC] border-[#E2E8F0]"
                                }`}
                            >
                                {/* Step Header */}
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-[#CBD5E1] text-[10px] font-bold text-[#475569] shadow-2xs">
                                            {idx + 1}
                                        </div>
                                        <span className="text-[13px] font-semibold text-[#0F172A]">
                                            {levelLabel}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    {isApproved && (
                                        <Badge variant="success" dot size="sm">
                                            Approved
                                        </Badge>
                                    )}
                                    {isRejected && (
                                        <Badge variant="danger" dot size="sm">
                                            Rejected
                                        </Badge>
                                    )}
                                    {isPending && isActionable && (
                                        <Badge variant="warning" dot size="sm">
                                            Action Required
                                        </Badge>
                                    )}
                                    {isPending && !isActionable && (
                                        <Badge variant="neutral" size="sm">
                                            Waiting
                                        </Badge>
                                    )}
                                </div>

                                {/* Step Metadata / Decision Details */}
                                {isApproved && (
                                    <div className="space-y-1 text-[11px] text-[#166534] pl-7">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                                            <span>
                                                Decided by{" "}
                                                <strong className="font-semibold text-[#14532D]">
                                                    {step.decidedBy?.name || "Reviewer"}
                                                </strong>
                                                {step.decidedBy?.role && (
                                                    <span className="text-[#15803D]">
                                                        {" "}
                                                        ({step.decidedBy.role})
                                                    </span>
                                                )}
                                                {step.decidedAt && (
                                                    <span> • {formatDateTime(step.decidedAt)}</span>
                                                )}
                                            </span>
                                        </div>
                                        {step.reason && (
                                            <p className="mt-1 p-2 rounded bg-white/70 border border-[#BBF7D0] text-[#15803D] italic">
                                                &ldquo;{step.reason}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                )}

                                {isRejected && (
                                    <div className="space-y-1 text-[11px] text-[#991B1B] pl-7">
                                        <div className="flex items-center gap-1.5">
                                            <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                                            <span>
                                                Rejected by{" "}
                                                <strong className="font-semibold text-[#7F1D1D]">
                                                    {step.decidedBy?.name || "Reviewer"}
                                                </strong>
                                                {step.decidedBy?.role && (
                                                    <span className="text-[#B91C1C]">
                                                        {" "}
                                                        ({step.decidedBy.role})
                                                    </span>
                                                )}
                                                {step.decidedAt && (
                                                    <span> • {formatDateTime(step.decidedAt)}</span>
                                                )}
                                            </span>
                                        </div>
                                        {step.reason && (
                                            <p className="mt-1 p-2 rounded bg-white/70 border border-[#FECACA] text-[#B91C1C] font-medium">
                                                Reason: {step.reason}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {isPending && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] pl-7">
                                        <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                                        <span>
                                            {isActionable
                                                ? "Awaiting review and sign-off"
                                                : "Pending completion of prior approval step"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Down Arrow between sequential steps */}
                            {!isLast && (
                                <div className="flex justify-center py-1">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                                        <ArrowDown className="w-3 h-3" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
