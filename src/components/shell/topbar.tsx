"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Bell,
    Plus,
    Menu,
    ChevronDown,
    LogOut,
    Shield,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { CommandPalette } from "@/components/shared/command-palette";
import { Dropdown } from "@/components/ui/dropdown";
import { USER_ROLE_META } from "@/lib/constants";

export interface TopbarProps {
    onToggleMobileSidebar: () => void;
}

export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
    const { user, logout } = useAuth();
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const router = useRouter();

    const roleBadge = user?.role ? USER_ROLE_META[user.role]?.badge || user.role : "User";

    // Quick create options
    const quickCreateItems = [
        {
            label: "New Quotation",
            onClick: () => router.push("/quotations/new"),
        },
        {
            label: "New Customer",
            onClick: () => router.push("/customers/new"),
        },
        {
            label: "New Product",
            onClick: () => router.push("/products/new"),
        },
    ];

    // User profile menu options
    const userMenuItems = [
        {
            label: (
                <div className="flex flex-col py-0.5">
                    <span className="font-semibold text-[#0F172A]">{user?.name || "Logged User"}</span>
                    <span className="text-[11px] text-[#64748B]">{user?.email || "user@dealflow360.com"}</span>
                </div>
            ),
            disabled: true,
        },
        {
            label: "Settings",
            icon: <Shield className="w-3.5 h-3.5" />,
            onClick: () => router.push("/settings"),
            dividerBefore: true,
        },
        {
            label: "Sign out",
            icon: <LogOut className="w-3.5 h-3.5" />,
            destructive: true,
            onClick: () => logout(),
            dividerBefore: true,
        },
    ];

    return (
        <>
            <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-[#E2E8F0] select-none">
                {/* Left: Brand + Mobile Hamburger */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onToggleMobileSidebar}
                        className="lg:hidden p-1.5 text-[#475569] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors"
                        aria-label="Open mobile menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1E40AF] text-white font-bold text-sm shadow-xs">
                            D
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0F172A] tracking-tight">
                                DealFlow<span className="text-[#1E40AF]">360</span>
                            </span>
                            <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                                Copilot
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Center: Global Search / Command Bar Trigger */}
                <div className="flex-1 max-w-md mx-4 hidden sm:block">
                    <button
                        type="button"
                        onClick={() => setIsCommandOpen(true)}
                        className="flex items-center justify-between w-full h-9 px-3 text-[13px] bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#94A3B8] hover:border-[#94A3B8] hover:bg-white transition-all cursor-pointer shadow-2xs"
                    >
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-[#94A3B8]" />
                            <span>Search quotations, customers, SKU...</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-white border border-[#CBD5E1] rounded">
                            ⌘K
                        </kbd>
                    </button>
                </div>

                {/* Right: Notifications + Quick Create + User Menu */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mobile Search Button */}
                    <button
                        type="button"
                        onClick={() => setIsCommandOpen(true)}
                        className="sm:hidden p-1.5 text-[#475569] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9]"
                        aria-label="Search"
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Notifications Bell */}
                    <button
                        type="button"
                        className="relative p-2 text-[#475569] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1E40AF]" />
                    </button>

                    {/* Quick Create Dropdown */}
                    <Dropdown
                        trigger={
                            <button
                                type="button"
                                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[12px] font-semibold hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create</span>
                                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                            </button>
                        }
                        items={quickCreateItems}
                        width="w-44"
                    />

                    {/* User Account Menu */}
                    <Dropdown
                        trigger={
                            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#E2E8F0] cursor-pointer">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] font-semibold text-[12px] border border-[#1E40AF]/20">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="hidden xl:flex flex-col text-left">
                                    <span className="text-[12px] font-semibold text-[#0F172A] leading-tight truncate max-w-[120px]">
                                        {user?.name || "Signed In"}
                                    </span>
                                    <span className="text-[10px] font-medium text-[#64748B] leading-tight">
                                        {roleBadge}
                                    </span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block" />
                            </div>
                        }
                        items={userMenuItems}
                        width="w-56"
                    />
                </div>
            </header>

            {/* Global Command Palette */}
            <CommandPalette
                isOpen={isCommandOpen}
                onClose={() => setIsCommandOpen(false)}
            />
        </>
    );
}
