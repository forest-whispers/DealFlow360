"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface InvoicesRedirectPageProps {
    params: Promise<{ id: string }>;
}

export default function InvoicesRedirectPage({ params }: InvoicesRedirectPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const router = useRouter();

    useEffect(() => {
        router.replace(`/billing/${id}`);
    }, [id, router]);

    return (
        <div className="p-8 text-center text-[13px] text-[#64748B]">
            Redirecting to Invoice Workspace...
        </div>
    );
}
