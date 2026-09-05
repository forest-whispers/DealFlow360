import React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "success" | "warning" | "danger" | "info" | "neutral";
    size?: "sm" | "default";
    dot?: boolean;
    leftIcon?: React.ReactNode;
}

export function Badge({
    className,
    variant = "neutral",
    size = "default",
    dot = false,
    leftIcon,
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={cn(
                // Base styling: restrained enterprise badge with 6px radius
                "inline-flex items-center font-semibold rounded-md border tracking-tight select-none transition-colors",
                // Semantic color tokens
                variant === "success" && "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]",
                variant === "warning" && "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
                variant === "danger" && "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]",
                variant === "info" && "bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]",
                variant === "neutral" && "bg-[#F1F5F9] border-[#E2E8F0] text-[#475569]",
                // Sizes
                size === "default" && "text-[11px] leading-[14px] px-2 py-0.5 gap-1.5",
                size === "sm" && "text-[10px] leading-[12px] px-1.5 py-0.5 gap-1",
                className
            )}
            {...props}
        >
            {dot && (
                <span
                    className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        variant === "success" && "bg-[#047857]",
                        variant === "warning" && "bg-[#B45309]",
                        variant === "danger" && "bg-[#B91C1C]",
                        variant === "info" && "bg-[#0369A1]",
                        variant === "neutral" && "bg-[#64748B]"
                    )}
                />
            )}
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
        </span>
    );
}
