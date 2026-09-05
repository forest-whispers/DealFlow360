"use client";

import React from "react";
import { useAuth, type UserProfile } from "@/context/auth-context";

export interface RoleGateProps {
    allowedRoles: Array<UserProfile["role"]>;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function RoleGate({
    allowedRoles,
    children,
    fallback = null,
}: RoleGateProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
