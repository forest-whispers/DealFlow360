"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, Send } from "lucide-react";
import type { QuotationStatus } from "@prisma/client";

export interface DealLifecycleBannerProps {
    status: QuotationStatus;
    isDirty?: boolean;
    approvalLevel?: string;
}

export function DealLifecycleBanner({
    status,
    isDirty = false,
    approvalLevel,
}: DealLifecycleBannerProps) {
    if (status === "DRAFT" && isDirty) {
        return (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] leading-4">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
                <span className="font-medium">
                    You have unsaved modifications in this draft. Click <strong>Save Draft</strong> to persist changes before submitting.
                </span>
            </div>
        );
    }

    if (status === "PENDING_APPROVAL") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] leading-4">
                <Clock className="w-4 h-4 shrink-0 text-[#D97706]" />
                <div>
                    <span className="font-semibold">Quotation Pending Approval:</span>{" "}
                    This deal requires{" "}
                    <span className="font-semibold">
                        {approvalLevel ? approvalLevel.replace(/_/g, " ") : "management"}
                    </span>{" "}
                    approval. Line items and commercial terms are frozen in this revision.
                </div>
            </div>
        );
    }

    if (status === "APPROVED") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] leading-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
                <div>
                    <span className="font-semibold">Quotation Approved:</span> All discounts and terms are within policy. Click <strong>Send Quotation</strong> to deliver this proposal to the customer.
                </div>
            </div>
        );
    }

    if (status === "SENT") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[12px] leading-4">
                <Send className="w-4 h-4 shrink-0 text-[#2563EB]" />
                <div>
                    <span className="font-semibold">Proposal Delivered:</span> This quotation has been sent to the customer for review and cannot be modified.
                </div>
            </div>
        );
    }

    if (status === "REJECTED") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <div>
                    <span className="font-semibold">Quotation Rejected:</span> This proposal exceeded governance discount ceilings or was rejected during approval review.
                </div>
            </div>
        );
    }

    if (status === "UNDER_NEGOTIATION") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[12px] leading-4">
                <Info className="w-4 h-4 shrink-0 text-[#2563EB]" />
                <div>
                    <span className="font-semibold">Under Customer Negotiation:</span> The customer has engaged with this proposal in the portal.
                </div>
            </div>
        );
    }

    if (status === "CONFIRMED") {
        return (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] leading-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
                <div>
                    <span className="font-semibold">Quotation Confirmed:</span> The customer has accepted commercial terms. The order is moving to fulfillment.
                </div>
            </div>
        );
    }

    return null;
}
