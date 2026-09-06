"use client";

import React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeTime } from "@/lib/formatters";
import { MessageSquare, GitCommit, Building } from "lucide-react";
import type {
    PortalChangeRequestResponse,
    PortalNegotiationMessageResponse,
} from "@/server/modules/negotiation/negotiation.types";

interface NegotiationTimelineProps {
    messages: PortalNegotiationMessageResponse[];
    changeRequests: PortalChangeRequestResponse[];
}

type TimelineItem =
    | {
          type: "message";
          id: string;
          createdAt: string;
          data: PortalNegotiationMessageResponse;
      }
    | {
          type: "change_request";
          id: string;
          createdAt: string;
          data: PortalChangeRequestResponse;
      };

export function NegotiationTimeline({
    messages,
    changeRequests,
}: NegotiationTimelineProps) {
    // Combine and sort chronologically (oldest first)
    const items: TimelineItem[] = [
        ...messages.map((m) => ({
            type: "message" as const,
            id: m.id,
            createdAt: m.createdAt,
            data: m,
        })),
        ...changeRequests.map((cr) => ({
            type: "change_request" as const,
            id: cr.id,
            createdAt: cr.createdAt,
            data: cr,
        })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (items.length === 0) {
        return (
            <div className="py-8 text-center text-[13px] text-[#64748B] bg-[#F8FAFC] rounded-lg border border-dashed border-[#E2E8F0]">
                <MessageSquare className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-60" />
                <p className="font-medium text-[#475569]">No negotiation history yet</p>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                    Send a message or propose commercial changes below to begin discussion.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => {
                if (item.type === "message") {
                    const msg = item.data;
                    const isCustomer = msg.authorType === "CUSTOMER";

                    return (
                        <div
                            key={`msg-${msg.id}`}
                            className={`flex flex-col ${
                                isCustomer ? "items-end" : "items-start"
                            }`}
                        >
                            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#64748B]">
                                {isCustomer ? (
                                    <>
                                        <span className="font-semibold text-[#1E40AF]">
                                            You
                                        </span>
                                        <span>•</span>
                                        <span>{formatRelativeTime(msg.createdAt)}</span>
                                    </>
                                ) : (
                                    <>
                                        <Building className="w-3 h-3 text-[#475569]" />
                                        <span className="font-semibold text-[#0F172A]">
                                            {msg.authorName || "Sales Team"}
                                        </span>
                                        <span>•</span>
                                        <span>{formatRelativeTime(msg.createdAt)}</span>
                                    </>
                                )}
                            </div>

                            <div
                                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed shadow-2xs ${
                                    isCustomer
                                        ? "bg-[#1E40AF] text-white rounded-tr-none"
                                        : "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-tl-none"
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>
                        </div>
                    );
                }

                // Change Request Card in timeline
                const cr = item.data;
                return (
                    <div
                        key={`cr-${cr.id}`}
                        className="p-3.5 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs space-y-2"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#EFF6FF] text-[#1E40AF]">
                                    <GitCommit className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-semibold text-[#0F172A]">
                                        Commercial Terms Proposed
                                    </p>
                                    <p className="text-[11px] text-[#64748B]">
                                        {formatRelativeTime(cr.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <StatusBadge
                                type="change-request"
                                status={cr.status}
                                size="sm"
                            />
                        </div>

                        {/* Proposal details */}
                        <div className="rounded-md bg-[#F8FAFC] p-2 text-[12px] space-y-1 font-mono text-[#334155] border border-[#F1F5F9]">
                            {cr.lineNumber !== null && (
                                <p>
                                    <span className="text-[#64748B]">Target: </span>
                                    Line #{cr.lineNumber}
                                </p>
                            )}
                            {cr.quantity !== null && (
                                <p>
                                    <span className="text-[#64748B]">Requested Quantity: </span>
                                    {cr.quantity} units
                                </p>
                            )}
                            {cr.discountPercent !== null && (
                                <p>
                                    <span className="text-[#64748B]">Requested Discount: </span>
                                    {cr.discountPercent}%
                                </p>
                            )}
                            {cr.orderDiscountPercent !== null && (
                                <p>
                                    <span className="text-[#64748B]">Requested Order Discount: </span>
                                    {cr.orderDiscountPercent}%
                                </p>
                            )}
                        </div>

                        {cr.message && (
                            <p className="text-[12px] text-[#475569] italic bg-white px-1">
                                &ldquo;{cr.message}&rdquo;
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
