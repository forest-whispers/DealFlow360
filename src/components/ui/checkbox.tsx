import React, { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: React.ReactNode;
    description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, description, checked, disabled, id, onChange, ...props }, ref) => {
        return (
            <label className={cn("inline-flex items-start gap-2.5 cursor-pointer select-none", disabled && "cursor-not-allowed opacity-60", className)}>
                <div className="relative flex items-center justify-center mt-0.5">
                    <input
                        type="checkbox"
                        ref={ref}
                        id={id}
                        checked={checked}
                        disabled={disabled}
                        onChange={onChange}
                        className="peer sr-only"
                        {...props}
                    />
                    <div
                        className={cn(
                            "w-4 h-4 rounded border transition-colors flex items-center justify-center bg-white",
                            checked
                                ? "bg-[#1E40AF] border-[#1E40AF] text-white"
                                : "border-[#CBD5E1] hover:border-[#94A3B8]"
                        )}
                    >
                        {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                </div>

                {(label || description) && (
                    <div className="flex flex-col">
                        {label && <span className="text-[13px] font-medium leading-[18px] text-[#0F172A]">{label}</span>}
                        {description && <span className="text-[11px] leading-[14px] text-[#475569]">{description}</span>}
                    </div>
                )}
            </label>
        );
    }
);

Checkbox.displayName = "Checkbox";
