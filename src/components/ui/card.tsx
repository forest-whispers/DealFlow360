import React from "react";
import { cn } from "@/lib/cn";

export function Card({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-lg border border-[#E2E8F0] bg-white shadow-xs transition-shadow",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex flex-col space-y-1 p-4 sm:p-5 border-b border-[#F1F5F9]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                "text-[15px] font-medium leading-[20px] text-[#0F172A] tracking-tight",
                className
            )}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardDescription({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn(
                "text-[13px] leading-[18px] text-[#475569]",
                className
            )}
            {...props}
        >
            {children}
        </p>
    );
}

export function CardContent({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-4 sm:p-5", className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex items-center p-4 sm:p-5 pt-0 border-t border-[#F1F5F9] mt-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
