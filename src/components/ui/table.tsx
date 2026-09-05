import React from "react";
import { cn } from "@/lib/cn";

export function Table({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="w-full overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
            <table
                className={cn("w-full caption-bottom text-left border-collapse", className)}
                {...props}
            >
                {children}
            </table>
        </div>
    );
}

export function TableHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead className={cn("bg-[#F8FAFC] border-b border-[#E2E8F0]", className)} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={cn("divide-y divide-[#F1F5F9]", className)} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({
    className,
    children,
    isClickable,
    ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { isClickable?: boolean }) {
    return (
        <tr
            className={cn(
                // Standard row height ~44px
                "h-11 transition-colors duration-150 hover:bg-[#F8FAFC]/80",
                isClickable && "cursor-pointer active:bg-[#F1F5F9]",
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
}

export function TableHead({
    className,
    children,
    align = "left",
    ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "center" | "right" }) {
    return (
        <th
            className={cn(
                // 11px / 16px / 600 uppercase tracking-wider
                "h-9 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] select-none whitespace-nowrap",
                align === "right" && "text-right",
                align === "center" && "text-center",
                align === "left" && "text-left",
                className
            )}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({
    className,
    children,
    align = "left",
    isNumeric = false,
    ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
    align?: "left" | "center" | "right";
    isNumeric?: boolean;
}) {
    return (
        <td
            className={cn(
                // 13px / 18px text
                "px-3.5 py-2.5 text-[13px] leading-[18px] text-[#0F172A] align-middle",
                align === "right" || isNumeric ? "text-right tabular-nums" : "",
                align === "center" && "text-center",
                align === "left" && "text-left",
                className
            )}
            {...props}
        >
            {children}
        </td>
    );
}

export function TableFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tfoot
            className={cn(
                "border-t border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-[13px] text-[#0F172A]",
                className
            )}
            {...props}
        >
            {children}
        </tfoot>
    );
}
