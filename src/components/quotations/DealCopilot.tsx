"use client";

import React, { useState, useRef, useEffect } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
    Bot,
    Send,
    RotateCcw,
    AlertCircle,
    Info,
    Sparkles,
    CheckCircle2,
    TrendingUp,
    ShieldAlert,
    HelpCircle,
    MessageSquare,
    Lightbulb,
} from "lucide-react";
import type { CopilotResponse, CopilotIntentType } from "@/types/deal-intelligence-client";

export interface DealCopilotProps {
    quotationId: string;
    quoteNumber: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ChatMessage {
    id: string;
    sender: "user" | "assistant";
    content: string;
    intent?: CopilotIntentType;
    actions?: Array<{ label: string; description: string }>;
    timestamp: Date;
}

const SUGGESTED_PROMPTS = [
    {
        label: "Summarize this deal",
        prompt: "Summarize this deal",
        intent: "DEAL_SUMMARY",
    },
    {
        label: "What are the biggest risks?",
        prompt: "What are the biggest risks in this deal?",
        intent: "DEAL_RISK",
    },
    {
        label: "What should I do next?",
        prompt: "What should I do next on this quotation?",
        intent: "NEXT_ACTION",
    },
    {
        label: "What could I upsell?",
        prompt: "What could I upsell for this customer?",
        intent: "UPSELL",
    },
    {
        label: "How should I approach negotiation?",
        prompt: "How should I approach the negotiation?",
        intent: "NEGOTIATION_ADVICE",
    },
] as const;

function getIntentBadgeMeta(intent?: CopilotIntentType): {
    label: string;
    variant: "info" | "neutral" | "warning" | "success" | "danger";
    icon: React.ReactNode;
} {
    switch (intent) {
        case "DEAL_SUMMARY":
            return {
                label: "Summary",
                variant: "info",
                icon: <Info className="w-3 h-3 text-[#0284C7]" />,
            };
        case "DEAL_RISK":
            return {
                label: "Risk Analysis",
                variant: "danger",
                icon: <ShieldAlert className="w-3 h-3 text-[#DC2626]" />,
            };
        case "NEXT_ACTION":
            return {
                label: "Recommended Next Step",
                variant: "success",
                icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />,
            };
        case "UPSELL":
            return {
                label: "Upsell Opportunity",
                variant: "warning",
                icon: <TrendingUp className="w-3 h-3 text-[#D97706]" />,
            };
        case "NEGOTIATION_ADVICE":
            return {
                label: "Negotiation Advice",
                variant: "info",
                icon: <Lightbulb className="w-3 h-3 text-[#2563EB]" />,
            };
        case "UNSUPPORTED":
            return {
                label: "Help",
                variant: "neutral",
                icon: <HelpCircle className="w-3 h-3 text-[#64748B]" />,
            };
        default:
            return {
                label: "Copilot Guidance",
                variant: "neutral",
                icon: <Bot className="w-3 h-3 text-[#64748B]" />,
            };
    }
}

export function DealCopilot({
    quotationId,
    quoteNumber,
    isOpen,
    onClose,
}: DealCopilotProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            // Focus textarea when opened
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 150);
        }
    }, [isOpen, messages, isLoading]);

    const messageIdCounterRef = useRef<number>(0);

    const handleSendMessage = async (textToSend?: string) => {
        const messageText = (textToSend ?? inputValue).trim();
        if (!messageText || isLoading) return;

        setError(null);
        setLastFailedMessage(null);

        messageIdCounterRef.current += 1;
        const currentCount = messageIdCounterRef.current;

        const userMessage: ChatMessage = {
            id: `msg-user-${currentCount}`,
            sender: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        if (!textToSend) {
            setInputValue("");
        }
        setIsLoading(true);

        try {
            const response = await apiClient.askDealCopilot<CopilotResponse>(
                quotationId,
                messageText
            );

            messageIdCounterRef.current += 1;
            const assistantCount = messageIdCounterRef.current;

            const assistantMessage: ChatMessage = {
                id: `msg-assistant-${assistantCount}`,
                sender: "assistant",
                content: response.answer,
                intent: response.intent,
                actions: response.actions,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Couldn't get a response from Deal Copilot.";
            setError(message);
            setLastFailedMessage(messageText);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        if (lastFailedMessage) {
            handleSendMessage(lastFailedMessage);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            width="lg"
            title={
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-[#0F172A]">
                                Deal Copilot
                            </span>
                            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                                {quoteNumber}
                            </Badge>
                        </div>
                    </div>
                </div>
            }
            description="Operational guidance, risk explanations, and commercial insights for this quotation."
        >
            <div className="flex flex-col h-full -mx-4 -my-4 sm:-mx-5 sm:-my-5">
                {/* Scrollable Conversation Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {messages.length === 0 ? (
                        /* Initial Empty State with Quick Prompts */
                        <div className="space-y-5 pt-2">
                            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                                <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-[13px]">
                                    <MessageSquare className="w-4 h-4 text-[#1E40AF]" />
                                    <span>Ask about this quotation</span>
                                </div>
                                <p className="text-[12px] leading-relaxed text-[#475569]">
                                    Ask questions about this deal’s commercial risks, next steps,
                                    upsell opportunities, or negotiation approach. Answers are
                                    grounded in authoritative quotation rules.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Suggested Prompts
                                </span>
                                <div className="flex flex-col gap-2">
                                    {SUGGESTED_PROMPTS.map((item) => (
                                        <button
                                            key={item.intent}
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() => handleSendMessage(item.prompt)}
                                            className="w-full text-left p-2.5 sm:px-3 rounded-md bg-white border border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F0F9FF] text-[12px] font-medium text-[#1E293B] transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                                        >
                                            <span className="group-hover:text-[#1E40AF]">
                                                {item.label}
                                            </span>
                                            <span className="text-[#94A3B8] group-hover:text-[#1E40AF] text-[12px]">
                                                →
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Message Stream */
                        <div className="space-y-4">
                            {messages.map((msg) => {
                                if (msg.sender === "user") {
                                    return (
                                        <div
                                            key={msg.id}
                                            className="flex flex-col items-end space-y-1"
                                        >
                                            <span className="text-[11px] font-medium text-[#64748B] px-1">
                                                You
                                            </span>
                                            <div className="max-w-[85%] rounded-lg rounded-tr-none px-3.5 py-2.5 bg-[#1E40AF] text-white text-[13px] leading-relaxed shadow-xs">
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                }

                                const badgeMeta = getIntentBadgeMeta(msg.intent);

                                return (
                                    <div
                                        key={msg.id}
                                        className="flex flex-col items-start space-y-1"
                                    >
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[11px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                                                <Bot className="w-3.5 h-3.5 text-[#1E40AF]" />
                                                Deal Copilot
                                            </span>
                                            {msg.intent && msg.intent !== "UNSUPPORTED" && (
                                                <Badge
                                                    variant={badgeMeta.variant}
                                                    size="sm"
                                                    leftIcon={badgeMeta.icon}
                                                >
                                                    {badgeMeta.label}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="w-full rounded-lg rounded-tl-none p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] leading-relaxed text-[#1E293B] space-y-2.5">
                                            <div className="whitespace-pre-wrap">{msg.content}</div>

                                            {/* Informational Action Highlights if returned */}
                                            {msg.actions && msg.actions.length > 0 && (
                                                <div className="pt-2 border-t border-[#E2E8F0]/80 space-y-1.5">
                                                    <span className="text-[11px] font-semibold text-[#64748B] block">
                                                        Recommended Action:
                                                    </span>
                                                    {msg.actions.map((act, i) => (
                                                        <div
                                                            key={i}
                                                            className="p-2 rounded bg-white border border-[#E2E8F0] text-[12px]"
                                                        >
                                                            <div className="font-semibold text-[#0F172A]">
                                                                {act.label}
                                                            </div>
                                                            <div className="text-[#475569] mt-0.5 text-[11px]">
                                                                {act.description}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Compact Thinking / Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-start space-y-1 pt-1">
                            <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-[#0F172A]">
                                <Bot className="w-3.5 h-3.5 text-[#1E40AF]" />
                                <span>Deal Copilot</span>
                            </div>
                            <div className="p-3.5 rounded-lg rounded-tl-none bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 text-[12px] text-[#64748B]">
                                <Sparkles className="w-3.5 h-3.5 text-[#1E40AF] animate-spin" />
                                <span>Deal Copilot is thinking...</span>
                            </div>
                        </div>
                    )}

                    {/* Isolated Error State inside Copilot Panel */}
                    {!isLoading && error && (
                        <div className="flex items-center justify-between p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px]">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                            {lastFailedMessage && (
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="inline-flex items-center gap-1 font-semibold underline hover:no-underline cursor-pointer ml-3 shrink-0"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Try again
                                </button>
                            )}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Message Composer */}
                <div className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-white space-y-2">
                    <div className="relative flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            rows={2}
                            maxLength={2000}
                            placeholder="Ask about this deal... (Enter to send, Shift+Enter for newline)"
                            className="w-full resize-none rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[13px] leading-[18px] text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] focus:outline-hidden disabled:bg-[#F1F5F9] disabled:cursor-not-allowed"
                        />
                        <Button
                            type="button"
                            variant="primary"
                            size="default"
                            disabled={!inputValue.trim() || isLoading}
                            onClick={() => handleSendMessage()}
                            className="h-[60px] px-3.5 shrink-0"
                            aria-label="Send question"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
                        <span>Read-only guidance. Quotation terms remain unchanged.</span>
                        {inputValue.length > 1500 && (
                            <span className="tabular-nums">
                                {inputValue.length}/2000
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Drawer>
    );
}
