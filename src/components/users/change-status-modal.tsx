"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, AlertTriangle, CheckCircle2, User } from "lucide-react";
import type {
    SafeUserResponse,
    UserStatusResponse,
} from "@/server/modules/users/user.types";

export interface ChangeStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: SafeUserResponse | null;
    onSuccess: (targetUserId: string, nextStatus: boolean) => void;
}

export function ChangeStatusModal({
    isOpen,
    onClose,
    targetUser,
    onSuccess,
}: ChangeStatusModalProps) {
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!targetUser) return null;

    const isDeactivating = targetUser.isActive;
    const nextStatus = !targetUser.isActive;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await apiClient.patch<UserStatusResponse>(
                API_ROUTES.USERS.UPDATE_STATUS(targetUser.id),
                { isActive: nextStatus }
            );

            toast.success(
                isDeactivating ? "User Deactivated" : "User Activated",
                `${targetUser.name}'s account has been ${
                    isDeactivating ? "deactivated" : "activated"
                }.`
            );

            onSuccess(targetUser.id, nextStatus);
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : `Failed to ${isDeactivating ? "deactivate" : "activate"} user.`;
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isSubmitting) onClose();
            }}
            title={isDeactivating ? "Deactivate User Account" : "Activate User Account"}
            description={
                isDeactivating
                    ? "Revoke application access and login capabilities for this organization member."
                    : "Restore application access and login capabilities for this organization member."
            }
            maxWidth="md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={isDeactivating ? "destructive" : "primary"}
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isDeactivating ? "Deactivate User" : "Activate User"}
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

                {/* Warning / Informational Callout */}
                {isDeactivating ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[12px] leading-4 text-[#B45309]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Immediate Authentication Revocation:</strong> Deactivating this user will prevent them from signing in. Subsequent requests using existing sessions will be rejected by the backend.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] leading-4 text-[#047857]">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Restore Account Access:</strong> Activating this user will allow them to log in to DealFlow360 again with their existing credentials.
                        </span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
