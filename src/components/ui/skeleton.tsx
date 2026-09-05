import React from "react";
import { cn } from "@/lib/cn";

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded bg-[#E2E8F0]/70",
                className
            )}
            {...props}
        />
    );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="h-11 border-b border-[#F1F5F9]">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-3.5 py-2.5">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
            ))}
        </tr>
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    );
}
