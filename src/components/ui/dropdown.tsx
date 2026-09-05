"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

export interface DropdownItem {
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    destructive?: boolean;
    disabled?: boolean;
    dividerBefore?: boolean;
}

export interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: "left" | "right";
    width?: string;
}

export function Dropdown({
    trigger,
    items,
    align = "right",
    width = "w-48",
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={cn(
                        "absolute z-40 mt-1.5 rounded-md border border-[#E2E8F0] bg-white shadow-md py-1 text-[13px] leading-[18px] focus:outline-none animate-in fade-in zoom-in-95",
                        align === "right" ? "right-0" : "left-0",
                        width
                    )}
                >
                    {items.map((item, idx) => (
                        <React.Fragment key={idx}>
                            {item.dividerBefore && (
                                <div className="my-1 border-t border-[#F1F5F9]" />
                            )}
                            <button
                                type="button"
                                disabled={item.disabled}
                                onClick={() => {
                                    if (!item.disabled && item.onClick) {
                                        item.onClick();
                                        setIsOpen(false);
                                    }
                                }}
                                className={cn(
                                    "flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-colors",
                                    item.destructive
                                        ? "text-[#B91C1C] hover:bg-[#FEF2F2]"
                                        : "text-[#0F172A] hover:bg-[#F8FAFC]",
                                    item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                                )}
                            >
                                {item.icon && <span className="shrink-0 text-[#94A3B8]">{item.icon}</span>}
                                <span className="flex-1 truncate">{item.label}</span>
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}
