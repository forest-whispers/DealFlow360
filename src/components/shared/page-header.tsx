import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    badge,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-3 pb-6 border-b border-[#E2E8F0] mb-6", className)}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-[12px] leading-4 text-[#94A3B8]">
                    {breadcrumbs.map((crumb, idx) => {
                        const isLast = idx === breadcrumbs.length - 1;
                        return (
                            <React.Fragment key={idx}>
                                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1]" />}
                                {crumb.href && !isLast ? (
                                    <Link
                                        href={crumb.href}
                                        className="hover:text-[#0F172A] transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className={cn(isLast && "text-[#475569] font-medium")}>
                                        {crumb.label}
                                    </span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
            )}

            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-[20px] leading-[26px] font-semibold text-[#0F172A] tracking-tight">
                        {title}
                    </h1>
                    {badge && <div className="shrink-0">{badge}</div>}
                </div>

                {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>

            {/* Optional Description */}
            {description && (
                <p className="text-[13px] leading-[18px] text-[#475569] max-w-3xl">
                    {description}
                </p>
            )}
        </div>
    );
}
