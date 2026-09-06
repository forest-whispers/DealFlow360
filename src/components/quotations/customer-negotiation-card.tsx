"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import {
    Check,
    Clock,
    FileText,
    MessageSquare,
    SlidersHorizontal,
    XCircle,
} from "lucide-react";
import type {
    CanonicalQuotationResponse,
} from "@/server/modules/quotations/quotation.types";
import type {
    PortalChangeRequestResponse,
    PortalNegotiationHistoryResponse,
} from "@/server/modules/negotiation/negotiation.types";

interface CustomerNegotiationCardProps {
    quotation: CanonicalQuotationResponse;
    canManage: boolean;
    onNegotiationUpdated: () => void;
}

export function CustomerNegotiationCard({
    quotation,
    canManage,
    onNegotiationUpdated,
}: CustomerNegotiationCardProps) {
    const { toast } = useToast();
    const [negotiation, setNegotiation] = useState<PortalNegotiationHistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Modals
    const [selectedRequest, setSelectedRequest] = useState<PortalChangeRequestResponse | null>(null);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
    const [isProposeModalOpen, setIsProposeModalOpen] = useState<boolean>(false);

    // Decline form
    const [declineReason, setDeclineReason] = useState<string>("");
    const [isDeclining, setIsDeclining] = useState<boolean>(false);

    // Propose terms form
    const [proposedDiscount, setProposedDiscount] = useState<number>(0);
    const [proposedQuantity, setProposedQuantity] = useState<number>(1);
    const [isExecuting, setIsExecuting] = useState<boolean>(false);

    const fetchNegotiation = useCallback(async () => {
        try {
            const data = await apiClient.get<PortalNegotiationHistoryResponse>(
                API_ROUTES.QUOTATIONS.NEGOTIATION(quotation.id)
            );
            setNegotiation(data);
        } catch {
            setNegotiation(null);
        } finally {
            setIsLoading(false);
        }
    }, [quotation.id]);

    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const data = await apiClient.get<PortalNegotiationHistoryResponse>(
                    API_ROUTES.QUOTATIONS.NEGOTIATION(quotation.id)
                );
                if (isMounted) {
                    setNegotiation(data);
                    setIsLoading(false);
                }
            } catch {
                if (isMounted) {
                    setNegotiation(null);
                    setIsLoading(false);
                }
            }
        }
        load();
        return () => {
            isMounted = false;
        };
    }, [quotation.id]);

    // Pending change requests
    const pendingRequests = negotiation?.changeRequests?.filter(
        (c) => c.status === "PENDING"
    ) || [];

    // If not loading and no pending requests and not UNDER_NEGOTIATION, don't show
    if (!isLoading && pendingRequests.length === 0 && quotation.status !== "UNDER_NEGOTIATION") {
        return null;
    }

    if (isLoading) {
        return null;
    }

    const handleOpenDeclineModal = (req: PortalChangeRequestResponse) => {
        setSelectedRequest(req);
        setDeclineReason("");
        setIsDeclineModalOpen(true);
    };

    const handleOpenProposeModal = (req: PortalChangeRequestResponse) => {
        setSelectedRequest(req);

        // Find authoritative current line to prefill
        const currentLine = req.lineNumber
            ? quotation.revision.lines.find((l) => l.lineNumber === req.lineNumber)
            : null;

        setProposedDiscount(
            req.discountPercent !== null
                ? req.discountPercent
                : currentLine?.discountPercent ?? 0
        );
        setProposedQuantity(
            req.quantity !== null
                ? req.quantity
                : currentLine?.quantity ?? 1
        );
        setIsProposeModalOpen(true);
    };

    const handleConfirmDecline = async () => {
        if (!selectedRequest) return;
        setIsDeclining(true);

        try {
            await apiClient.post(
                API_ROUTES.QUOTATIONS.CHANGE_REQUEST_REJECT(
                    quotation.id,
                    selectedRequest.id
                ),
                { reason: declineReason.trim() || undefined }
            );

            toast.success(
                "Request Declined",
                "Customer negotiation request has been declined."
            );
            setIsDeclineModalOpen(false);
            fetchNegotiation();
            onNegotiationUpdated();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to decline request.";
            toast.error("Decline Failed", msg);
        } finally {
            setIsDeclining(false);
        }
    };

    const handleConfirmProposeTerms = async () => {
        if (!selectedRequest || !selectedRequest.lineNumber) return;
        setIsExecuting(true);

        try {
            const changes = [];
            const currentLine = quotation.revision.lines.find(
                (l) => l.lineNumber === selectedRequest.lineNumber
            );

            if (
                currentLine &&
                proposedDiscount !== currentLine.discountPercent
            ) {
                changes.push({
                    lineNumber: selectedRequest.lineNumber,
                    type: "LINE_DISCOUNT" as const,
                    discountPercent: Number(proposedDiscount),
                });
            }

            if (
                currentLine &&
                proposedQuantity !== currentLine.quantity
            ) {
                changes.push({
                    lineNumber: selectedRequest.lineNumber,
                    type: "LINE_QUANTITY" as const,
                    quantity: Number(proposedQuantity),
                });
            }

            if (changes.length === 0) {
                toast.warning(
                    "No Changes",
                    "Proposed terms are identical to current quotation terms."
                );
                setIsExecuting(false);
                return;
            }

            await apiClient.post(
                API_ROUTES.QUOTATIONS.AI_NEGOTIATION_EXECUTE(quotation.id),
                {
                    sourceRevisionId: quotation.revision.id,
                    sourceRevisionNumber: quotation.revision.revisionNumber,
                    changes,
                }
            );

            toast.success(
                "Revised Terms Executed",
                `Revision ${quotation.revision.revisionNumber + 1} created. Review and send to customer.`
            );
            setIsProposeModalOpen(false);
            fetchNegotiation();
            onNegotiationUpdated();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to execute revised terms.";
            toast.error("Execution Failed", msg);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <>
            <Card className="border-[#F59E0B] bg-[#FFFBEB] shadow-sm overflow-hidden mb-6">
                <CardHeader className="bg-white border-b border-[#FDE68A] pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FEF3C7] text-[#D97706]">
                            <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                                Customer Negotiation Request
                                <Badge variant="warning" size="sm" dot>
                                    Awaiting Sales Review
                                </Badge>
                            </CardTitle>
                            <p className="text-[11px] text-[#64748B]">
                                The customer proposed adjustments to this deal. Active quotation terms remain Revision {quotation.revision.revisionNumber}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#92400E] font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Status: Under Negotiation</span>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {pendingRequests.length === 0 ? (
                        <div className="p-3 bg-white rounded-md border border-[#FDE68A] text-[12px] text-[#64748B]">
                            <p>
                                Quotation is currently marked as Under Negotiation. No pending structured change requests found.
                            </p>
                        </div>
                    ) : (
                        pendingRequests.map((req) => {
                            const currentLine = req.lineNumber
                                ? quotation.revision.lines.find(
                                      (l) => l.lineNumber === req.lineNumber
                                  )
                                : null;

                            return (
                                <div
                                    key={req.id}
                                    className="p-4 bg-white rounded-lg border border-[#FDE68A] space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2.5">
                                        <div>
                                            <span className="font-semibold text-[13px] text-[#0F172A]">
                                                {currentLine
                                                    ? `Line ${req.lineNumber}: ${currentLine.name}`
                                                    : req.lineNumber
                                                    ? `Line ${req.lineNumber}`
                                                    : "Order Level Commercial Proposal"}
                                            </span>
                                            {currentLine?.sku && (
                                                <span className="text-[11px] text-[#64748B] ml-2 font-mono">
                                                    ({currentLine.sku})
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-[11px] text-[#94A3B8]">
                                            Submitted {new Date(req.createdAt).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Line Comparison: Current Authoritative vs Requested */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                                        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block">
                                                Authoritative Current Terms (Rev {quotation.revision.revisionNumber})
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#64748B]">Line Discount:</span>
                                                <span className="font-bold text-[#0F172A]">
                                                    {currentLine?.discountPercent ?? quotation.revision.orderDiscountPercent}%
                                                </span>
                                            </div>
                                            {currentLine && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[#64748B]">Quantity:</span>
                                                        <span className="font-bold text-[#0F172A]">
                                                            {currentLine.quantity}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[#64748B]">Line Total:</span>
                                                        <FinancialNumeral
                                                            amount={currentLine.lineTotal}
                                                            variant="body"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="p-2.5 rounded bg-[#FEF3C7]/40 border border-[#FDE68A] space-y-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B45309] block">
                                                Customer Requested Terms
                                            </span>
                                            {req.discountPercent !== null && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#92400E]">Requested Discount:</span>
                                                    <span className="font-extrabold text-[#B45309] text-[13px]">
                                                        {req.discountPercent}%
                                                    </span>
                                                </div>
                                            )}
                                            {req.quantity !== null && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#92400E]">Requested Quantity:</span>
                                                    <span className="font-extrabold text-[#B45309]">
                                                        {req.quantity}
                                                    </span>
                                                </div>
                                            )}
                                            {req.orderDiscountPercent !== null && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#92400E]">Requested Order Discount:</span>
                                                    <span className="font-extrabold text-[#B45309]">
                                                        {req.orderDiscountPercent}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer Rationale / Message */}
                                    {req.message && (
                                        <div className="flex items-start gap-2 p-2.5 bg-[#FFFBEB] rounded border border-[#FDE68A] text-[12px] text-[#92400E]">
                                            <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D97706]" />
                                            <div>
                                                <span className="font-semibold">Customer Rationale: </span>
                                                <span>{req.message}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons for Sales */}
                                    {canManage && (
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDeclineModal(req)}
                                                leftIcon={<XCircle className="w-3.5 h-3.5 text-[#DC2626]" />}
                                                className="text-[#DC2626] hover:bg-[#FEF2F2]"
                                            >
                                                Decline Request
                                            </Button>

                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleOpenProposeModal(req)}
                                                leftIcon={<Check className="w-3.5 h-3.5" />}
                                            >
                                                Propose Revised Terms
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* Decline Request Modal */}
            <Modal
                isOpen={isDeclineModalOpen}
                onClose={() => !isDeclining && setIsDeclineModalOpen(false)}
                title="Decline Customer Negotiation Request"
                description="The customer will be notified that this commercial request has been declined. The quotation will remain at current terms."
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeclining}
                            onClick={() => setIsDeclineModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isDeclining}
                            onClick={handleConfirmDecline}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        >
                            Confirm Decline
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3 py-2 text-[13px]">
                    <p className="text-[#64748B]">
                        You are declining the request for{" "}
                        <strong className="text-[#0F172A]">
                            Line {selectedRequest?.lineNumber}
                        </strong>{" "}
                        ({selectedRequest?.discountPercent !== null ? `${selectedRequest?.discountPercent}% discount` : ""}).
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-[#0F172A]">
                            Reason / Note to Customer (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="e.g. We cannot accommodate a 17% discount for this order volume, but we can offer expedited shipping."
                            className="w-full text-[13px] rounded-md border border-[#CBD5E1] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
                        />
                    </div>
                </div>
            </Modal>

            {/* Propose Revised Terms Modal */}
            <Modal
                isOpen={isProposeModalOpen}
                onClose={() => !isExecuting && setIsProposeModalOpen(false)}
                title="Propose Revised Commercial Terms"
                description={`This will authoritatively create Revision ${quotation.revision.revisionNumber + 1} with the revised terms.`}
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isExecuting}
                            onClick={() => setIsProposeModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isExecuting}
                            onClick={handleConfirmProposeTerms}
                        >
                            Execute Revision {quotation.revision.revisionNumber + 1}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-2 text-[13px]">
                    <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-1">
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-[#64748B]">Current Effective Discount:</span>
                            <span className="font-semibold text-[#0F172A]">
                                {selectedRequest?.lineNumber
                                    ? quotation.revision.lines.find(
                                          (l) => l.lineNumber === selectedRequest.lineNumber
                                      )?.discountPercent ?? 0
                                    : 0}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-[#64748B]">Customer Requested:</span>
                            <span className="font-bold text-[#B45309]">
                                {selectedRequest?.discountPercent}% discount
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-[#0F172A] block">
                            Proposed Discount Percentage (%)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={proposedDiscount}
                                onChange={(e) => setProposedDiscount(Number(e.target.value))}
                                className="w-24 h-9 text-[13px] rounded border border-[#CBD5E1] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
                            />
                            <span className="text-[13px] text-[#64748B]">%</span>
                            <button
                                type="button"
                                onClick={() =>
                                    setProposedDiscount(selectedRequest?.discountPercent ?? 0)
                                }
                                className="text-[11px] text-[#1E40AF] hover:underline ml-2"
                            >
                                Match Customer Request ({selectedRequest?.discountPercent}%)
                            </button>
                        </div>
                    </div>

                    <div className="p-3 bg-[#EFF6FF] rounded border border-[#BFDBFE] text-[12px] text-[#1E40AF] flex items-start gap-2">
                        <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block">Authoritative Revision Execution</span>
                            <span>
                                Submitting will create Revision {quotation.revision.revisionNumber + 1}, run discount governance rules, mark customer pending request as Accepted, and allow you to send the proposal to the customer.
                            </span>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
