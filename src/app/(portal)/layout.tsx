"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PortalShell } from "@/components/shell/portal-shell";

export default function CustomerPortalLayout({
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
            } else if (!isCustomer) {
                router.replace("/dashboard");
            }
        }
    }, [isLoading, isAuthenticated, isCustomer, router]);

    // Neutral minimal loading state during initial customer session verification
    if (isLoading && !isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1E40AF] text-white font-bold text-base shadow-xs animate-pulse mb-3">
                    D
                </div>
                <p className="text-[12px] font-medium text-[#64748B]">
                    Verifying customer session...
                </p>
            </div>
        );
    }

    // UX safeguard: do not render customer portal if unauthenticated or internal user
    if (!isAuthenticated || !isCustomer) {
        return null;
    }

    return <PortalShell>{children}</PortalShell>;
}
