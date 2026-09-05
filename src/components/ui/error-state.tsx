import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
    compact?: boolean;
}

export function ErrorState({
    title = "Unable to load data",
    message,
    onRetry,
    className,
    compact = false,
}: ErrorStateProps) {
    if (compact) {
        return (
            <div
                className={cn(
                    "flex items-center justify-between p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]",
                    className
                )}
            >
                <div className="flex items-center gap-2 text-[12px] leading-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-[12px] font-semibold underline hover:no-underline ml-3 cursor-pointer shrink-0"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-[#FECACA] bg-[#FEF2F2]/40",
                className
            )}
        >
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#FEF2F2] text-[#B91C1C] mb-3">
                <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight mb-1">
                {title}
            </h3>
            <p className="text-[13px] leading-[18px] text-[#475569] max-w-md mb-4">
                {message}
            </p>
            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                    Retry action
                </Button>
            )}
        </div>
    );
}
