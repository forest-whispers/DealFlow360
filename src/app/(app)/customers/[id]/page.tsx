"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EditCustomerModal } from "@/components/customers/edit-customer-modal";
import { ChangeCustomerStatusModal } from "@/components/customers/change-customer-status-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { formatDateTime } from "@/lib/formatters";
import {
    CUSTOMER_MANAGE_ROLES,
    CUSTOMER_STATUS_ROLES,
} from "@/lib/constants";
import {
    ArrowLeft,
    Building,
    Calendar,
    Edit3,
    Mail,
    Phone,
    ShieldAlert,
    User,
    UserCheck,
} from "lucide-react";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";

interface CustomerDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
    const resolvedParams = use(params);
    const customerId = resolvedParams.id;
    const { user: currentUser } = useAuth();

    const [customer, setCustomer] = useState<CustomerResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

    const canEditCustomer =
        currentUser && CUSTOMER_MANAGE_ROLES.includes(currentUser.role);
    const canChangeStatus =
        currentUser && CUSTOMER_STATUS_ROLES.includes(currentUser.role);

    useEffect(() => {
        let isMounted = true;

        async function fetchCustomer() {
            try {
                const response = await apiClient.get<{ customer: CustomerResponse }>(
                    API_ROUTES.CUSTOMERS.BY_ID(customerId)
                );

                if (isMounted) {
                    setCustomer(response.customer);
                    setErrorMessage(null);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Failed to load customer profile.";
                    setErrorMessage(message);
                    setIsLoading(false);
                }
            }
        }

        fetchCustomer();

        return () => {
            isMounted = false;
        };
    }, [customerId, refreshTrigger]);

    const handleRetry = () => {
        setIsLoading(true);
        setErrorMessage(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleCustomerUpdated = (updated: CustomerResponse) => {
        setCustomer(updated);
    };

    const handleStatusChanged = (targetId: string, nextStatus: boolean) => {
        setCustomer((prev) => (prev ? { ...prev, isActive: nextStatus } : null));
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-6 w-32 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-14 w-full bg-[#E2E8F0] rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-72 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="h-72 bg-[#E2E8F0] rounded animate-pulse" />
                </div>
            </div>
        );
    }

    if (errorMessage || !customer) {
        return (
            <div className="space-y-6">
                <Link
                    href="/customers"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Customers
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <ErrorState
                            title="Customer Not Found"
                            message={errorMessage || "The requested customer profile could not be loaded."}
                            onRetry={handleRetry}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const profile = (customer.customerProfile as Record<string, unknown>) || {};
    const company = typeof profile.companyName === "string" ? profile.companyName : null;
    const phone = typeof profile.phone === "string" ? profile.phone : null;
    const notes = typeof profile.notes === "string" ? profile.notes : null;

    // Remaining profile keys if any
    const knownKeys = new Set(["companyName", "phone", "notes"]);
    const extraProfileEntries = Object.entries(profile).filter(([k]) => !knownKeys.has(k));

    return (
        <div className="space-y-6">
            {/* Back Navigation */}
            <div>
                <Link
                    href="/customers"
                    className="inline-flex items-center text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Customers
                </Link>
            </div>

            {/* Customer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div className="flex items-start gap-3.5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-bold text-[18px] shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[20px] leading-[26px] font-bold text-[#0F172A]">
                                {customer.name}
                            </h1>
                            <StatusBadge
                                type="tier"
                                status={customer.customerTier || "BRONZE"}
                            />
                            <Badge variant={customer.isActive ? "success" : "neutral"} dot>
                                {customer.isActive ? "Active Account" : "Suspended"}
                            </Badge>
                        </div>
                        <p className="text-[13px] text-[#64748B] mt-0.5">{customer.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canEditCustomer && (
                        <Button
                            variant="outline"
                            size="default"
                            leftIcon={<Edit3 className="w-4 h-4" />}
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            Edit Profile
                        </Button>
                    )}

                    {canChangeStatus && (
                        <Button
                            variant={customer.isActive ? "outline" : "primary"}
                            size="default"
                            leftIcon={
                                customer.isActive ? (
                                    <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                                ) : (
                                    <UserCheck className="w-4 h-4" />
                                )
                            }
                            onClick={() => setIsStatusModalOpen(true)}
                        >
                            {customer.isActive ? "Deactivate Account" : "Activate Account"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Account Details Card */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                            <User className="w-4 h-4 text-[#64748B]" />
                            Account Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-1">
                        <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Full Name
                            </span>
                            <p className="text-[13px] font-medium text-[#0F172A]">
                                {customer.name}
                            </p>
                        </div>

                        <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Primary Email
                            </span>
                            <div className="flex items-center gap-1.5 text-[13px] text-[#0F172A]">
                                <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>{customer.email}</span>
                            </div>
                        </div>

                        <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Commercial Tier
                            </span>
                            <div className="mt-1">
                                <StatusBadge
                                    type="tier"
                                    status={customer.customerTier || "BRONZE"}
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Account Standing
                            </span>
                            <Badge variant={customer.isActive ? "success" : "neutral"} dot>
                                {customer.isActive ? "Active / In Good Standing" : "Suspended"}
                            </Badge>
                        </div>

                        <div className="pt-3 border-t border-[#E2E8F0]">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Customer ID
                            </span>
                            <code className="text-[11px] text-[#475569] font-mono bg-[#F1F5F9] px-2 py-1 rounded block truncate">
                                {customer.id}
                            </code>
                        </div>

                        <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                Enrolled Since
                            </span>
                            <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDateTime(customer.createdAt)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Commercial Profile & Contact Info */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                            <Building className="w-4 h-4 text-[#64748B]" />
                            Commercial Profile & Engagement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                    Company / Organization
                                </span>
                                <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
                                    <Building className="w-4 h-4 text-[#64748B]" />
                                    <span>{company || "Individual Account"}</span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                                <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] block mb-1">
                                    Direct Contact Phone
                                </span>
                                <div className="flex items-center gap-2 text-[14px] font-medium text-[#0F172A]">
                                    <Phone className="w-4 h-4 text-[#64748B]" />
                                    <span>{phone || "Not specified"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Account Notes */}
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-2">
                                Commercial Terms & Account Notes
                            </span>
                            {notes ? (
                                <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] leading-relaxed text-[#334155] whitespace-pre-wrap">
                                    {notes}
                                </div>
                            ) : (
                                <p className="text-[13px] text-[#94A3B8] italic">
                                    No internal relationship notes recorded.
                                </p>
                            )}
                        </div>

                        {/* Additional Profile Attributes (if any exist) */}
                        {extraProfileEntries.length > 0 && (
                            <div>
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-2">
                                    Additional Metadata
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {extraProfileEntries.map(([key, val]) => (
                                        <div
                                            key={key}
                                            className="p-2.5 rounded-md bg-[#F1F5F9] border border-[#E2E8F0]"
                                        >
                                            <span className="text-[11px] font-medium text-[#64748B] block capitalize">
                                                {key.replace(/([A-Z])/g, " $1")}
                                            </span>
                                            <span className="text-[12px] font-semibold text-[#0F172A] truncate block">
                                                {typeof val === "object"
                                                    ? JSON.stringify(val)
                                                    : String(val)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={customer}
                onSuccess={handleCustomerUpdated}
            />

            <ChangeCustomerStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                customer={customer}
                onSuccess={handleStatusChanged}
            />
        </div>
    );
}
