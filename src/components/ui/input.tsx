import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    prefixText?: string;
    suffixText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    error?: string | boolean;
    helperText?: string;
    isNumeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            className,
            prefixText,
            suffixText,
            leftIcon,
            rightIcon,
            error,
            helperText,
            isNumeric,
            disabled,
            id,
            ...props
        },
        ref
    ) => {
        const hasLeft = Boolean(prefixText || leftIcon);
        const hasRight = Boolean(suffixText || rightIcon);

        return (
            <div className="w-full">
                <div
                    className={cn(
                        "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                        // Default border vs Error border
                        error
                            ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C] focus-within:border-transparent"
                            : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF] focus-within:border-transparent",
                        disabled && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                    )}
                >
                    {/* Left Addon/Icon */}
                    {hasLeft && (
                        <div className="flex items-center pl-3 pr-1 text-[#94A3B8] text-[13px] select-none shrink-0">
                            {prefixText && <span className="font-medium text-[#475569]">{prefixText}</span>}
                            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
                        </div>
                    )}

                    <input
                        id={id}
                        ref={ref}
                        disabled={disabled}
                        className={cn(
                            // 36px enterprise input height
                            "w-full h-9 bg-transparent px-3 text-[13px] leading-[18px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed",
                            hasLeft && "pl-1.5",
                            hasRight && "pr-1.5",
                            isNumeric && "tabular-nums text-right",
                            className
                        )}
                        {...props}
                    />

                    {/* Right Addon/Icon */}
                    {hasRight && (
                        <div className="flex items-center pr-3 pl-1 text-[#94A3B8] text-[13px] select-none shrink-0">
                            {suffixText && <span className="font-medium text-[#475569]">{suffixText}</span>}
                            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
                        </div>
                    )}
                </div>

                {/* Validation message or Helper text */}
                {typeof error === "string" && (
                    <p className="mt-1 text-[11px] leading-[14px] text-[#B91C1C] font-medium">{error}</p>
                )}
                {!error && helperText && (
                    <p className="mt-1 text-[11px] leading-[14px] text-[#475569]">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
