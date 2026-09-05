import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-[#CBD5E1] bg-white",
                className
            )}
        >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F1F5F9] text-[#475569] mb-3.5">
                {icon || <FolderOpen className="w-6 h-6 text-[#94A3B8]" />}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight mb-1">
                {title}
            </h3>
            <p className="text-[13px] leading-[18px] text-[#475569] max-w-md mb-5">
                {description}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}
