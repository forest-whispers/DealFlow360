import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string | boolean;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, helperText, disabled, id, rows = 3, ...props }, ref) => {
        return (
            <div className="w-full">
                <textarea
                    id={id}
                    ref={ref}
                    rows={rows}
                    disabled={disabled}
                    className={cn(
                        "w-full rounded-md border bg-white p-3 text-[13px] leading-[18px] text-[#0F172A] placeholder:text-[#94A3B8] transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed",
                        error
                            ? "border-[#FECACA] focus:ring-2 focus:ring-[#B91C1C]"
                            : "border-[#CBD5E1] focus:ring-2 focus:ring-[#1E40AF]",
                        disabled && "bg-[#F1F5F9] border-[#E2E8F0] opacity-75",
                        className
                    )}
                    {...props}
                />

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

Textarea.displayName = "Textarea";
