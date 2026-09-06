"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, SlidersHorizontal, AlertCircle, Lock } from "lucide-react";

interface NegotiationComposerProps {
    isNegotiable: boolean;
    isPendingApproval: boolean;
    isConfirmed: boolean;
    isSendingMessage?: boolean;
    isPreviewing?: boolean;
    onSendMessage: (message: string) => Promise<void>;
    onPreviewMessage: (message: string) => Promise<void>;
    onOpenStructuredModal: () => void;
}

export function NegotiationComposer({
    isNegotiable,
    isPendingApproval,
    isConfirmed,
    isSendingMessage = false,
    isPreviewing = false,
    onSendMessage,
    onPreviewMessage,
    onOpenStructuredModal,
}: NegotiationComposerProps) {
    const [text, setText] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!text.trim()) return;
        setLocalError(null);
        try {
            await onSendMessage(text.trim());
            setText("");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setLocalError(err.message);
            } else {
                setLocalError("Failed to send message.");
            }
        }
    };

    const handlePreview = async () => {
        if (!text.trim()) return;
        setLocalError(null);
        try {
            await onPreviewMessage(text.trim());
        } catch (err: unknown) {
            if (err instanceof Error) {
                setLocalError(err.message);
            } else {
                setLocalError("Failed to interpret negotiation proposal.");
            }
        }
    };

    if (isConfirmed) {
        return (
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3 text-[13px] text-[#64748B]">
                <Lock className="w-4 h-4 text-[#059669] shrink-0" />
                <span>
                    This quotation has been confirmed. Commercial terms and line items are locked.
                </span>
            </div>
        );
    }

    if (isPendingApproval) {
        return (
            <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-[13px] text-[#92400E]">
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">Commercial Proposal Under Internal Review</p>
                    <p className="text-[12px] text-[#B45309] mt-0.5">
                        Your latest proposed terms are currently being reviewed by the sales and finance team. Further adjustments can be submitted once this review completes.
                    </p>
                </div>
            </div>
        );
    }

    if (!isNegotiable) {
        return (
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#64748B]">
                This quotation is not currently open for commercial negotiation.
            </div>
        );
    }

    return (
        <div className="space-y-3 p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
            {localError && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[12px] text-[#991B1B] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{localError}</span>
                </div>
            )}

            <div className="space-y-1">
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message or describe proposed terms (e.g. 'Can we get a 10% discount on line 1 for 50 units?')..."
                    rows={3}
                    maxLength={2000}
                    className="resize-none text-[13px]"
                />
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                    <span>
                        Propose commercial changes in natural language or as a standard discussion note.
                    </span>
                    <span className="tabular-nums">{text.length} / 2000</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Secondary Action: Structured Change Request */}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenStructuredModal}
                    leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B]" />}
                    className="text-[12px]"
                >
                    Structured Change Request
                </Button>

                {/* Primary Proposal / Message Actions */}
                <div className="flex items-center gap-2">
                    {/* Natural language AI preview */}
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!text.trim() || isSendingMessage || isPreviewing}
                        isLoading={isPreviewing}
                        onClick={handlePreview}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />}
                        className="text-[12px]"
                    >
                        Preview Terms
                    </Button>

                    {/* Standard Message Submit */}
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!text.trim() || isSendingMessage || isPreviewing}
                        isLoading={isSendingMessage}
                        onClick={handleSend}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                        className="text-[12px]"
                    >
                        Send Message
                    </Button>
                </div>
            </div>
        </div>
    );
}
