"use client";

import React from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
    id: string;
    label: string;
    badge?: string | number;
    icon?: React.ReactNode;
}

export interface TabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn("border-b border-[#E2E8F0] flex items-center gap-1", className)}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 cursor-pointer select-none",
                            isActive
                                ? "border-[#1E40AF] text-[#1E40AF]"
                                : "border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1]"
                        )}
                    >
                        {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span
                                className={cn(
                                    "px-1.5 py-0.2 rounded text-[10px] font-semibold",
                                    isActive
                                        ? "bg-[#EFF6FF] text-[#1E40AF]"
                                        : "bg-[#F1F5F9] text-[#64748B]"
                                )}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
