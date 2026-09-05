"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Building2, ChevronRight, Shield, Users } from "lucide-react";

export default function SettingsOverviewPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="space-y-6">
            {/* Organization Identity Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>Organization Profile</CardTitle>
                            <CardDescription>
                                Workspace identity and commercial organization parameters.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                                Organization ID
                            </span>
                            <span className="text-[13px] font-mono font-medium text-[#0F172A] break-all">
                                {user?.organizationId || "—"}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                                Your Operational Role
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#1E40AF]" />
                                <span className="text-[13px] font-semibold text-[#0F172A]">
                                    {user?.role ? user.role.replace(/_/g, " ") : "—"}
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                                Account Email
                            </span>
                            <span className="text-[13px] font-medium text-[#0F172A] truncate block">
                                {user?.email || "—"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Access Cards for Administrator */}
            {isAdmin && (
                <Card className="border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF]/40 to-white">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E40AF] text-white">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Member Access & Role Governance</CardTitle>
                                    <CardDescription>
                                        You have administrator privileges to view organization members, change operational roles, and manage access status.
                                    </CardDescription>
                                </div>
                            </div>

                            <Link href="/settings/users">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                >
                                    Manage Members
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}
