"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/billing?tab=subscriptions");
    }, [router]);

    return (
        <div className="p-8 text-center text-[13px] text-[#64748B]">
            Redirecting to Subscriptions Workspace...
        </div>
    );
}
