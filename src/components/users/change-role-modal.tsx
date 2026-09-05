"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, ArrowRight, ShieldCheck, User } from "lucide-react";
import {
    INTERNAL_USER_ROLES,
    type InternalUserRole,
} from "@/server/modules/users/user.constants";
import type {
    SafeUserResponse,
    UserRoleChangeResponse,
} from "@/server/modules/users/user.types";

export interface ChangeRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: SafeUserResponse | null;
    onSuccess: (updatedUser: SafeUserResponse) => void;
}

const ROLE_DESCRIPTIONS: Record<InternalUserRole, string> = {
    ADMIN: "Full administrative authority across organization members, system roles, and commercial policies.",
    SALES_MANAGER: "Sales leadership authority with high-threshold quotation discount approval capabilities.",
    FINANCE_OPERATIONS: "Operational authority over margins, warehouse fulfillment, billing, and financial compliance.",
    SALES_REP: "Commercial representative authority to initialize quotations, draft revisions, and negotiate terms.",
};

const ROLE_DISPLAY_NAMES: Record<InternalUserRole, string> = {
    ADMIN: "Administrator",
    SALES_MANAGER: "Sales Manager",
    FINANCE_OPERATIONS: "Finance & Operations",
    SALES_REP: "Sales Representative",
};

export function ChangeRoleModal({
    isOpen,
    onClose,
    targetUser,
    onSuccess,
}: ChangeRoleModalProps) {
    const { toast } = useToast();

    const [selectedRoleOverride, setSelectedRoleOverride] =
        useState<InternalUserRole | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleClose = () => {
        if (isSubmitting) return;
        setSelectedRoleOverride(null);
        setErrorMessage(null);
        onClose();
    };

    if (!targetUser) return null;

    const currentRole = targetUser.role as InternalUserRole;
    const selectedRole = selectedRoleOverride ?? currentRole;
    const isRoleUnchanged = selectedRole === currentRole;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRoleUnchanged) {
            handleClose();
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const result = await apiClient.patch<UserRoleChangeResponse>(
                API_ROUTES.USERS.UPDATE_ROLE(targetUser.id),
                { role: selectedRole }
            );

            toast.success(
                "Role Updated",
                `${targetUser.name}'s role was updated to ${ROLE_DISPLAY_NAMES[selectedRole]}.`
            );

            onSuccess(result.user);
            handleClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to update user role.";
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Change User Role"
            description="Assign a new operational role and update permission boundaries for this organization member."
            maxWidth="md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || isRoleUnchanged}
                        onClick={handleSubmit}
                    >
                        Confirm Role Change
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Target User Summary Box */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#475569]">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {targetUser.name}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                            {targetUser.email}
                        </p>
                    </div>
                </div>

                {/* Role Transition Indicator */}
                <div className="flex items-center justify-between p-3 rounded-md bg-white border border-[#E2E8F0] text-[12px]">
                    <div className="space-y-0.5">
                        <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">
                            Current Role
                        </span>
                        <span className="font-semibold text-[#0F172A]">
                            {ROLE_DISPLAY_NAMES[currentRole] || currentRole}
                        </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                    <div className="space-y-0.5 text-right">
                        <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">
                            New Role
                        </span>
                        <span className="font-semibold text-[#1E40AF]">
                            {ROLE_DISPLAY_NAMES[selectedRole] || selectedRole}
                        </span>
                    </div>
                </div>

                {/* Role Selection Dropdown */}
                <div>
                    <label
                        htmlFor="role-select"
                        className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                    >
                        Target Role <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Select
                        id="role-select"
                        value={selectedRole}
                        onChange={(e) =>
                            setSelectedRoleOverride(e.target.value as InternalUserRole)
                        }
                        disabled={isSubmitting}
                    >
                        {INTERNAL_USER_ROLES.map((roleKey) => (
                            <option key={roleKey} value={roleKey}>
                                {ROLE_DISPLAY_NAMES[roleKey]}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Role Scope Description */}
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] leading-4 text-[#1E40AF]">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{ROLE_DESCRIPTIONS[selectedRole]}</span>
                </div>
            </form>
        </Modal>
    );
}
