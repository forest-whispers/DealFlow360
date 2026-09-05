"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";

export function PortalShell({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const userMenuItems = [
        {
            label: (
                <div className="flex flex-col py-0.5">
                    <span className="font-semibold text-[#0F172A]">{user?.name || "Customer Contact"}</span>
                    <span className="text-[11px] text-[#64748B]">{user?.email}</span>
                </div>
            ),
            disabled: true,
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
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            {/* Customer Portal Topbar (Clean, Trustworthy, Restrained) */}
            <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-8 bg-white border-b border-[#E2E8F0]">
                {/* Brand & Customer Portal Tag */}
                <div className="flex items-center gap-6">
                    <Link href="/portal/quotations" className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1E40AF] text-white font-bold text-sm">
                            D
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0F172A]">
                                DealFlow<span className="text-[#1E40AF]">360</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                                Customer Portal
                            </span>
                        </div>
                    </Link>

                    {/* Customer Navigation */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <Link
                            href="/portal/quotations"
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                                pathname.startsWith("/portal/quotations")
                                    ? "bg-[#EFF6FF] text-[#1E40AF] font-semibold"
                                    : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            <span>My Quotations</span>
                        </Link>
                    </nav>
                </div>

                {/* Right: Customer Profile */}
                <div className="flex items-center gap-3">
                    <Dropdown
                        trigger={
                            <div className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-[#F1F5F9] transition-colors">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] font-semibold text-[12px] border border-[#1E40AF]/20">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
                                </div>
                                <div className="hidden sm:flex flex-col text-left">
                                    <span className="text-[12px] font-semibold text-[#0F172A] leading-tight">
                                        {user?.name || "Customer"}
                                    </span>
                                    <span className="text-[10px] text-[#64748B] leading-tight">
                                        Authorized Buyer
                                    </span>
                                </div>
                            </div>
                        }
                        items={userMenuItems}
                        width="w-52"
                    />
                </div>
            </header>

            {/* Portal Content Area */}
            <main className="flex-1 p-4 sm:p-8 bg-[#F8FAFC]">
                <div className="max-w-5xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
