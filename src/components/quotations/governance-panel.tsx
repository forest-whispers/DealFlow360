"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Shield, XCircle } from "lucide-react";
import type { QuotationEvaluationResponse } from "@/server/modules/quotations/quotation.types";

export interface GovernancePanelProps {
    evaluation?: QuotationEvaluationResponse | null;
}

export function GovernancePanel({ evaluation }: GovernancePanelProps) {
    if (!evaluation) {
        return (
            <Card className="border-[#E2E8F0]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#64748B]" />
                        Discount Governance
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-[12px] text-[#64748B] italic pt-1">
                    Add products with commercial discounts to evaluate governance policy.
                </CardContent>
            </Card>
        );
    }

    const { status, approvalLevel, message } = evaluation;

    const statusBadgeVariant =
        status === "WITHIN_LIMIT"
            ? "success"
            : status === "APPROVAL_REQUIRED"
            ? "warning"
            : "danger";

    const statusLabel =
        status === "WITHIN_LIMIT"
            ? "Within Policy"
            : status === "APPROVAL_REQUIRED"
            ? "Approval Required"
            : "Ceiling Exceeded";

    const approvalLevelLabel =
        approvalLevel === "NONE"
            ? "None (Auto-Approved)"
            : approvalLevel === "SALES_MANAGER"
            ? "Sales Manager"
            : approvalLevel === "FINANCE_OPERATIONS"
            ? "Finance & Operations"
            : approvalLevel;

    return (
        <Card className="border-[#E2E8F0]">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#64748B]" />
                        Discount Governance
                    </CardTitle>
                    <Badge variant={statusBadgeVariant} dot>
                        {statusLabel}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
                {/* Approval Requirement Level */}
                <div className="flex items-center justify-between text-[12px] py-1 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Required Authority</span>
                    <span className="font-semibold text-[#0F172A]">
                        {approvalLevelLabel}
                    </span>
                </div>

                {/* Explanatory Message from Backend */}
                {message && (
                    <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] leading-relaxed text-[#334155] flex items-start gap-2">
                        {status === "WITHIN_LIMIT" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                        ) : status === "APPROVAL_REQUIRED" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
                        )}
                        <span>{message}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
