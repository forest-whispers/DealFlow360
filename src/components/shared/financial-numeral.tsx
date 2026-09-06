import React from "react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/cn";

export interface FinancialNumeralProps extends React.HTMLAttributes<HTMLSpanElement> {
    amount?: number | string | null;
    value?: number | string | null;
    rate?: number | string | null;
    currency?: string;
    variant?: "display" | "heading" | "subtotal" | "body" | "metadata";
    type?: "currency" | "percentage" | "quantity";
    coloredDelta?: boolean;
    prefix?: string;
    suffix?: string;
}

export function FinancialNumeral({
    amount,
    value,
    rate,
    currency = "INR",
    variant = "body",
    type = "currency",
    coloredDelta = false,
    prefix,
    suffix,
    className,
    ...props
}: FinancialNumeralProps) {
    const rawValue = amount ?? value;
    let formattedText: string;

    if (type === "percentage") {
        formattedText = formatPercentage(rate ?? rawValue);
    } else if (type === "quantity") {
        formattedText = rawValue !== undefined && rawValue !== null ? String(rawValue) : "—";
    } else {
        formattedText = formatCurrency(rawValue, currency);
    }

    const numericValue = typeof rawValue === "number" ? rawValue : typeof rawValue === "string" ? parseFloat(rawValue) : 0;

    return (
        <span
            className={cn(
                // Tabular numerals in Inter font
                "tabular-nums font-sans inline-flex items-baseline",
                // Hierarchy variants matching visual design tokens
                variant === "display" && "text-[28px] leading-[34px] font-semibold tracking-tight text-[#0F172A]",
                variant === "heading" && "text-[20px] leading-[26px] font-semibold tracking-tight text-[#0F172A]",
                variant === "subtotal" && "text-[14px] leading-[20px] font-bold text-[#0F172A]",
                variant === "body" && "text-[13px] leading-[18px] text-[#0F172A]",
                variant === "metadata" && "text-[11px] leading-[14px] text-[#475569]",
                // Optional colored delta for variance / discount savings
                coloredDelta && numericValue > 0 && "text-[#047857]",
                coloredDelta && numericValue < 0 && "text-[#B91C1C]",
                className
            )}
            {...props}
        >
            {prefix && <span className="mr-0.5">{prefix}</span>}
            <span>{formattedText}</span>
            {suffix && <span className="ml-0.5">{suffix}</span>}
        </span>
    );
}
