import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "subtle";
    size?: "sm" | "default" | "lg" | "icon";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "default",
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base operational control styling (4px rhythm, smooth 150ms transition)
                    "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
                    // Variants
                    variant === "primary" &&
                        "bg-[#1E40AF] text-white hover:bg-[#1E3A8A] active:bg-[#172554] shadow-xs",
                    variant === "secondary" &&
                        "bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] hover:bg-[#E2E8F0] active:bg-[#CBD5E1]",
                    variant === "outline" &&
                        "bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] active:bg-[#F1F5F9]",
                    variant === "ghost" &&
                        "bg-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] active:bg-[#E2E8F0]",
                    variant === "destructive" &&
                        "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEE2E2] active:bg-[#FCA5A5]",
                    variant === "subtle" &&
                        "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE] active:bg-[#BFDBFE]",
                    // Heights & Sizes
                    size === "default" && "h-9 px-3.5 text-[13px] gap-2",
                    size === "sm" && "h-7 px-2.5 text-[12px] gap-1.5",
                    size === "lg" && "h-10 px-4 text-[14px] gap-2",
                    size === "icon" && "h-9 w-9 p-0",
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                ) : (
                    <>
                        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";
