"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function RootPage() {
    const { isLoading, isAuthenticated, isCustomer } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace("/login");
            } else if (isCustomer) {
                router.replace("/portal/quotations");
            } else {
                router.replace("/dashboard");
            }
        }
    }, [isLoading, isAuthenticated, isCustomer, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E40AF] text-white font-bold text-lg shadow-sm animate-pulse mb-3">
                D
            </div>
            <p className="text-[13px] text-[#64748B] font-medium">
                Loading DealFlow360...
            </p>
        </div>
    );
}
