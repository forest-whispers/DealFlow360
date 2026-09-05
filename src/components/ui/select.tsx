import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string | boolean;
    helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, error, helperText, disabled, id, ...props }, ref) => {
        return (
            <div className="w-full">
                <div
                    className={cn(
                        "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                        error
                            ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C] focus-within:border-transparent"
                            : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF] focus-within:border-transparent",
                        disabled && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                    )}
                >
                    <select
                        id={id}
                        ref={ref}
                        disabled={disabled}
                        className={cn(
                            "w-full h-9 bg-transparent pl-3 pr-8 text-[13px] leading-[18px] text-[#0F172A] appearance-none focus:outline-none disabled:cursor-not-allowed cursor-pointer",
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    <ChevronDown className="absolute right-2.5 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                </div>

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

Select.displayName = "Select";
