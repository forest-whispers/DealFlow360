"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Users,
    Package,
    ShieldAlert,
    Truck,
    Receipt,
    Sliders,
    Warehouse,
    Settings,
    ChevronLeft,
    ChevronRight,
    Building2,
} from "lucide-react";
import { INTERNAL_NAV_SECTIONS, type NavItem } from "@/lib/constants";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/cn";

export interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

// Icon mapper for dynamic string icon names
const iconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    FileText: <FileText className="w-4 h-4 shrink-0" />,
    Users: <Users className="w-4 h-4 shrink-0" />,
    Package: <Package className="w-4 h-4 shrink-0" />,
    ShieldAlert: <ShieldAlert className="w-4 h-4 shrink-0" />,
    Truck: <Truck className="w-4 h-4 shrink-0" />,
    Receipt: <Receipt className="w-4 h-4 shrink-0" />,
    Sliders: <Sliders className="w-4 h-4 shrink-0" />,
    Warehouse: <Warehouse className="w-4 h-4 shrink-0" />,
    Settings: <Settings className="w-4 h-4 shrink-0" />,
};

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 select-none z-20 shrink-0",
                isCollapsed ? "w-16" : "w-60"
            )}
        >
            {/* Nav Sections */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
                {INTERNAL_NAV_SECTIONS.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                        {!isCollapsed && (
                            <h4 className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                {section.title}
                            </h4>
                        )}

                        <div className="space-y-0.5">
                            {section.items.map((item: NavItem) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={isCollapsed ? item.label : undefined}
                                        className={cn(
                                            "flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors group",
                                            isActive
                                                ? "bg-[#EFF6FF] text-[#1E40AF] font-semibold border-l-2 border-[#1E40AF]"
                                                : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                    >
                                        <span className={cn(isActive ? "text-[#1E40AF]" : "text-[#64748B] group-hover:text-[#0F172A]")}>
                                            {iconMap[item.icon] || <FileText className="w-4 h-4" />}
                                        </span>

                                        {!isCollapsed && (
                                            <span className="flex-1 truncate">{item.label}</span>
                                        )}

                                        {!isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                                                {item.badgeCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom: Organization Info & Collapse Toggle */}
            <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 mb-2 px-1">
                        <div className="flex items-center justify-center w-7 h-7 rounded bg-white border border-[#CBD5E1] text-[#475569]">
                            <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold text-[#0F172A] truncate">
                                {user?.organizationId ? "Acme Enterprise" : "DealFlow Corp"}
                            </span>
                            <span className="text-[10px] text-[#64748B] truncate">Commercial Ops</span>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="flex items-center justify-center w-full h-8 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <div className="flex items-center gap-2 text-[11px] font-medium text-[#64748B]">
                            <ChevronLeft className="w-4 h-4" />
                            <span>Collapse sidebar</span>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}

export function MobileSidebar({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const pathname = usePathname();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-[#E2E8F0] shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between h-14 px-4 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1E40AF] text-white font-bold text-sm">
                            D
                        </div>
                        <span className="text-[15px] font-bold text-[#0F172A]">
                            DealFlow<span className="text-[#1E40AF]">360</span>
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
                    {INTERNAL_NAV_SECTIONS.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            <h4 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                {section.title}
                            </h4>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                                                isActive
                                                    ? "bg-[#EFF6FF] text-[#1E40AF] font-semibold"
                                                    : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                                            )}
                                        >
                                            <span className={cn(isActive ? "text-[#1E40AF]" : "text-[#64748B]")}>
                                                {iconMap[item.icon]}
                                            </span>
                                            <span className="flex-1 truncate">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
