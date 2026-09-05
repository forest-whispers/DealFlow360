"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    side?: "left" | "right";
    width?: "sm" | "md" | "lg" | "xl";
}

export function Drawer({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    side = "right",
    width = "md",
}: DrawerProps) {
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
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel */}
            <div
                className={cn(
                    "fixed inset-y-0 flex max-w-full z-10",
                    side === "right" ? "right-0 pl-10" : "left-0 pr-10"
                )}
            >
                <div
                    className={cn(
                        "w-screen bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                        width === "sm" && "max-w-sm",
                        width === "md" && "max-w-md",
                        width === "lg" && "max-w-lg",
                        width === "xl" && "max-w-xl",
                        side === "right" ? "border-l border-[#E2E8F0]" : "border-r border-[#E2E8F0]"
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                        <div>
                            {title && (
                                <h3 className="text-[15px] font-semibold leading-[20px] text-[#0F172A]">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="text-[12px] leading-[16px] text-[#475569] mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-md transition-colors cursor-pointer"
                            aria-label="Close panel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-[13px] leading-[18px]">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2.5">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
