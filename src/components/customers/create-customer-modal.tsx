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
import { AlertCircle, Building, Mail, Phone, ShieldCheck, User } from "lucide-react";
import type { CustomerResponse } from "@/server/modules/customers/customer.types";

export interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (customer: CustomerResponse) => void;
}

export function CreateCustomerModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateCustomerModalProps) {
    const { toast } = useToast();

    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [customerTier, setCustomerTier] = useState<string>("BRONZE");
    const [companyName, setCompanyName] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        name?: string;
        email?: string;
        password?: string;
    }>({});

    const handleClose = () => {
        if (isSubmitting) return;
        setName("");
        setEmail("");
        setPassword("");
        setCustomerTier("BRONZE");
        setCompanyName("");
        setPhone("");
        setNotes("");
        setErrorMessage(null);
        setValidationErrors({});
        onClose();
    };

    const validate = (): boolean => {
        const errors: { name?: string; email?: string; password?: string } = {};

        if (!name.trim() || name.trim().length < 2) {
            errors.name = "Customer name must be at least 2 characters.";
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = "A valid email address is required.";
        }
        if (!password || password.length < 8) {
            errors.password = "Initial password must be at least 8 characters.";
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
                password,
                customerTier,
                customerProfile: Object.keys(profileData).length > 0 ? profileData : null,
            };

            const response = await apiClient.post<{ customer: CustomerResponse }>(
                API_ROUTES.CUSTOMERS.CREATE,
                payload
            );

            toast.success(
                "Customer Created",
                `${response.customer.name} has been enrolled successfully.`
            );

            handleClose();
            if (onSuccess) {
                onSuccess(response.customer);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to create customer account.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Customer Account"
            description="Register an external customer account for quoting and commercial engagement."
            maxWidth="lg"
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
                        onClick={handleSubmit}
                    >
                        Create Customer
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
                    {/* Password */}
                    <div>
                        <label className="block text-[12px] font-medium text-[#0F172A] mb-1.5">
                            Initial Portal Password <span className="text-[#B91C1C]">*</span>
                        </label>
                        <Input
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (validationErrors.password) {
                                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                                }
                            }}
                            leftIcon={<ShieldCheck className="w-4 h-4" />}
                            error={validationErrors.password}
                            disabled={isSubmitting}
                        />
                    </div>

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
                        Commercial Profile Details (Optional)
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
            </form>
        </Modal>
    );
}
