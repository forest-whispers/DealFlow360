"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useToast } from "@/context/toast-context";
import { AlertCircle, Building, Mail, Phone, User } from "lucide-react";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";

export interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: CustomerResponse | null;
    onSuccess: (updatedCustomer: CustomerResponse) => void;
}

interface EditCustomerFormProps {
    customer: CustomerResponse;
    onClose: () => void;
    onSuccess: (updatedCustomer: CustomerResponse) => void;
}

function EditCustomerForm({
    customer,
    onClose,
    onSuccess,
}: EditCustomerFormProps) {
    const { toast } = useToast();

    const profile = (customer.customerProfile as Record<string, unknown>) || {};
    const [name, setName] = useState<string>(customer.name || "");
    const [email, setEmail] = useState<string>(customer.email || "");
    const [customerTier, setCustomerTier] = useState<string>(customer.customerTier || "BRONZE");
    const [companyName, setCompanyName] = useState<string>(
        typeof profile.companyName === "string" ? profile.companyName : ""
    );
    const [phone, setPhone] = useState<string>(
        typeof profile.phone === "string" ? profile.phone : ""
    );
    const [notes, setNotes] = useState<string>(
        typeof profile.notes === "string" ? profile.notes : ""
    );

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        name?: string;
        email?: string;
    }>({});

    const validate = (): boolean => {
        const errors: { name?: string; email?: string } = {};

        if (!name.trim() || name.trim().length < 2) {
            errors.name = "Customer name must be at least 2 characters.";
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = "A valid email address is required.";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        const profileData: Record<string, unknown> = {};
        if (companyName.trim()) profileData.companyName = companyName.trim();
        if (phone.trim()) profileData.phone = phone.trim();
        if (notes.trim()) profileData.notes = notes.trim();

        try {
            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                customerTier,
                customerProfile: Object.keys(profileData).length > 0 ? profileData : null,
            };

            const response = await apiClient.patch<{ customer: CustomerResponse }>(
                API_ROUTES.CUSTOMERS.BY_ID(customer.id),
                payload
            );

            toast.success(
                "Customer Updated",
                `Customer profile for ${response.customer.name} was updated.`
            );

            onSuccess(response.customer);
            onClose();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to update customer account.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Customer / Contact Name <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Input
                        placeholder="e.g. Sarah Jenkins"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (validationErrors.name) {
                                setValidationErrors((prev) => ({ ...prev, name: undefined }));
                            }
                        }}
                        leftIcon={<User className="w-4 h-4" />}
                        error={validationErrors.name}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Email Address <span className="text-[#B91C1C]">*</span>
                    </label>
                    <Input
                        type="email"
                        placeholder="sarah@acme-corp.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (validationErrors.email) {
                                setValidationErrors((prev) => ({ ...prev, email: undefined }));
                            }
                        }}
                        leftIcon={<Mail className="w-4 h-4" />}
                        error={validationErrors.email}
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Tier */}
                <div>
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Commercial Tier
                    </label>
                    <Select
                        value={customerTier}
                        onChange={(e) => setCustomerTier(e.target.value)}
                        disabled={isSubmitting}
                    >
                        <option value="BRONZE">Bronze Tier (Standard)</option>
                        <option value="SILVER">Silver Tier (Preferred)</option>
                        <option value="GOLD">Gold Tier (Strategic)</option>
                    </Select>
                </div>
            </div>

            {/* Company & Phone Profile Attributes */}
            <div className="pt-2 border-t border-[#E2E8F0]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-3">
                    Commercial Profile Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Company / Organization
                        </label>
                        <Input
                            placeholder="Acme Corporation"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            leftIcon={<Building className="w-4 h-4" />}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Direct Phone
                        </label>
                        <Input
                            placeholder="+1 (555) 019-2834"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            leftIcon={<Phone className="w-4 h-4" />}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                        Account Notes / Commercial Terms
                    </label>
                    <Textarea
                        placeholder="Add any internal onboarding notes or relationship context..."
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
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
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                >
                    Save Changes
                </Button>
            </div>
        </form>
    );
}

export function EditCustomerModal({
    isOpen,
    onClose,
    customer,
    onSuccess,
}: EditCustomerModalProps) {
    if (!customer) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Customer Profile"
            description="Update commercial tier and contact information."
            maxWidth="lg"
        >
            <EditCustomerForm
                key={customer.id}
                customer={customer}
                onClose={onClose}
                onSuccess={onSuccess}
            />
        </Modal>
    );
}
