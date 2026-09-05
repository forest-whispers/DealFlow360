"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { Building2, Users } from "lucide-react";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const isAdmin = user?.role === "ADMIN";
    const isUsersTab = pathname.startsWith("/settings/users");

    // Sub-navigation tabs: Users & Access visible only to ADMIN
    const tabs: TabItem[] = [
        ...(isAdmin
            ? [
                  {
                      id: "users",
                      label: "Users & Access",
                      icon: <Users className="w-4 h-4" />,
                  },
              ]
            : []),
        {
            id: "general",
            label: "Organization",
            icon: <Building2 className="w-4 h-4" />,
        },
    ];

    const activeTab = isUsersTab ? "users" : "general";

    const handleTabChange = (tabId: string) => {
        if (tabId === "users") {
            router.push("/settings/users");
        } else {
            router.push("/settings");
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Manage organization profile, member access permissions, and system administration."
                breadcrumbs={[
                    { label: "DealFlow360", href: "/dashboard" },
                    { label: "Settings", href: "/settings" },
                    ...(isUsersTab ? [{ label: "Users & Access" }] : []),
                ]}
            />

            {/* Settings Sub-navigation Bar */}
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={handleTabChange}
                className="mb-6"
            />

            {/* Tab Page Content */}
            <div>{children}</div>
        </div>
    );
}
