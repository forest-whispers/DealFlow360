"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    maxWidth = "md",
}: ModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Modal Dialog Box */}
            <div
                role="dialog"
                aria-modal="true"
                className={cn(
                    "relative w-full rounded-lg border border-[#E2E8F0] bg-white shadow-lg z-10 overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95",
                    maxWidth === "sm" && "max-w-sm",
                    maxWidth === "md" && "max-w-md",
                    maxWidth === "lg" && "max-w-lg",
                    maxWidth === "xl" && "max-w-xl",
                    maxWidth === "2xl" && "max-w-2xl"
                )}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#F1F5F9]">
                        <div className="space-y-1 pr-6">
                            {title && (
                                <h2 className="text-[16px] font-semibold leading-[22px] text-[#0F172A]">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-[13px] leading-[18px] text-[#475569]">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-md transition-colors cursor-pointer"
                            aria-label="Close dialog"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 sm:p-5 text-[13px] leading-[18px] text-[#0F172A]">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
