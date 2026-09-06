"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight, X } from "lucide-react";
import type {
    NegotiationChange,
    NegotiationPreviewResult,
} from "@/server/modules/ai/negotiation/negotiation.types";

interface NegotiationPreviewCardProps {
    preview: NegotiationPreviewResult;
    currency?: string;
    isExecuting?: boolean;
    onExecute: (changes: NegotiationChange[]) => void;
    onDismiss: () => void;
}

export function NegotiationPreviewCard({
    preview,
    currency = "INR",
    isExecuting = false,
    onExecute,
    onDismiss,
}: NegotiationPreviewCardProps) {
    const isInterpreted = preview.status === "INTERPRETED";
    const isAmbiguous = preview.status === "AMBIGUOUS";
    const isUnsupported = preview.status === "UNSUPPORTED";

    return (
        <Card className="border-[#3B82F6] bg-[#F8FAFC] shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isInterpreted && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ECFDF5] text-[#059669]">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        )}
                        {isAmbiguous && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFFBEB] text-[#D97706]">
                                <HelpCircle className="w-4 h-4" />
                            </div>
                        )}
                        {isUnsupported && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FEF2F2] text-[#DC2626]">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        )}
                        <div>
                            <CardTitle className="text-[14px] font-bold text-[#0F172A]">
                                Commercial Proposal Preview
                            </CardTitle>
                            <p className="text-[11px] text-[#64748B]">
                                Review calculated commercial terms before submitting to sales team.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isInterpreted && (
                            <Badge variant="success" size="sm" dot>
                                Interpreted
                            </Badge>
                        )}
                        {isAmbiguous && (
                            <Badge variant="warning" size="sm" dot>
                                Needs Clarification
                            </Badge>
                        )}
                        {isUnsupported && (
                            <Badge variant="danger" size="sm" dot>
                                Unsupported Request
                            </Badge>
                        )}
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded transition-colors"
                            aria-label="Dismiss preview"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Ambiguous Feedback */}
                {isAmbiguous && (
                    <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-[12px] text-[#92400E] space-y-1">
                        <p className="font-semibold">
                            We could not clearly identify the specific line items or requested adjustments.
                        </p>
                        <p>
                            Please specify the line number (e.g. &ldquo;10% discount on line 1&rdquo; or &ldquo;change line 2 quantity to 50&rdquo;), or use the Structured Change Request form.
                        </p>
                    </div>
                )}

                {/* Unsupported Feedback */}
                {isUnsupported && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[12px] text-[#991B1B] space-y-1">
                        <p className="font-semibold">
                            This commercial change request cannot be processed automatically.
                        </p>
                        <p>
                            Commercial proposals can request discount adjustments or quantity changes on existing line items. For adding new items, please post a note in the negotiation thread.
                        </p>
                    </div>
                )}

                {/* Interpreted Changes Table */}
                {isInterpreted && preview.changes && preview.changes.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[12px] font-semibold text-[#0F172A]">
                            Affected Line Items
                        </p>
                        <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-md bg-white overflow-hidden text-[12px]">
                            {preview.changes.map((ch) => (
                                <div
                                    key={ch.lineNumber}
                                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                    <div>
                                        <span className="font-medium text-[#0F172A]">
                                            Line {ch.lineNumber}: {ch.productName}
                                        </span>
                                        {ch.sku && (
                                            <span className="text-[11px] text-[#64748B] ml-2 font-mono">
                                                ({ch.sku})
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[12px] tabular-nums">
                                        {/* Qty change */}
                                        {ch.before.quantity !== ch.after.quantity && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#64748B]">Qty:</span>
                                                <span className="line-through text-[#94A3B8]">
                                                    {ch.before.quantity}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-[#3B82F6]" />
                                                <span className="font-bold text-[#0F172A]">
                                                    {ch.after.quantity}
                                                </span>
                                            </div>
                                        )}

                                        {/* Discount change */}
                                        {ch.before.discountPercent !== ch.after.discountPercent && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#64748B]">Discount:</span>
                                                <span className="line-through text-[#94A3B8]">
                                                    {ch.before.discountPercent}%
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-[#3B82F6]" />
                                                <span className="font-bold text-[#059669]">
                                                    {ch.after.discountPercent}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Line Total Before vs After */}
                                        <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E8F0]">
                                            <span className="line-through text-[#94A3B8]">
                                                <FinancialNumeral
                                                    amount={ch.before.lineTotal}
                                                    currency={currency}
                                                />
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-[#3B82F6]" />
                                            <span className="font-bold text-[#1E40AF]">
                                                <FinancialNumeral
                                                    amount={ch.after.lineTotal}
                                                    currency={currency}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Overall Commercial Comparison (Customer Safe - No Margin Leaked!) */}
                {isInterpreted && preview.before && preview.after && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-md border border-[#E2E8F0]">
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                                Current Commercial Total
                            </span>
                            <p className="text-[16px] font-bold text-[#475569] tabular-nums">
                                <FinancialNumeral
                                    amount={preview.before.total}
                                    currency={currency}
                                />
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                                Subtotal:{" "}
                                <FinancialNumeral
                                    amount={preview.before.subtotal}
                                    currency={currency}
                                />
                            </p>
                        </div>

                        <div className="space-y-1 border-l border-[#E2E8F0] pl-3">
                            <span className="text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider">
                                Proposed Commercial Total
                            </span>
                            <p className="text-[16px] font-extrabold text-[#1E40AF] tabular-nums">
                                <FinancialNumeral
                                    amount={preview.after.total}
                                    currency={currency}
                                />
                            </p>
                            <p className="text-[11px] text-[#059669] font-medium">
                                Net Difference:{" "}
                                <FinancialNumeral
                                    amount={preview.after.total - preview.before.total}
                                    currency={currency}
                                />
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-white border-t border-[#E2E8F0] py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <span className="font-semibold text-[#0F172A]">Note:</span> Submitting sends this proposal for sales review. Active quotation terms remain unchanged until approved by sales.
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDismiss}
                        disabled={isExecuting}
                    >
                        Cancel
                    </Button>

                    {isInterpreted && preview.intent && (
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isExecuting}
                            onClick={() => onExecute(preview.intent?.changes ?? [])}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                            Submit Proposal for Review
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
