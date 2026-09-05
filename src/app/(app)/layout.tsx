"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, isCustomer } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace("/login");
            } else if (isCustomer) {
                router.replace("/portal/quotations");
            }
        }
    }, [isLoading, isAuthenticated, isCustomer, router]);

    // Neutral minimal loading state: prevents UI flashing during initial session resolution
    if (isLoading && !isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1E40AF] text-white font-bold text-base shadow-xs animate-pulse mb-3">
                    D
                </div>
                <p className="text-[12px] font-medium text-[#64748B]">
                    Verifying session...
                </p>
            </div>
        );
    }

    // UX safeguard: do not render internal application shell if unauthenticated or customer
    if (!isAuthenticated || isCustomer) {
        return null;
    }

    return <AppShell>{children}</AppShell>;
}
