"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, ArrowRight, Lock, Mail, Building, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export default function SignupPage() {
    const { signup } = useAuth();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [organizationSlug, setOrganizationSlug] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form errors
    const [errors, setErrors] = useState<{
        name?: string;
        email?: string;
        organizationName?: string;
        organizationSlug?: string;
        password?: string;
        general?: string;
    }>({});

    // Auto-generate slug from organization name if not manually edited
    const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setOrganizationName(val);
        if (!isSlugManuallyEdited) {
            const generated = val
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
            setOrganizationSlug(generated);
        }
    };

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!name.trim() || name.trim().length < 2) {
            newErrors.name = "Full name must be at least 2 characters.";
        }

        if (!email.trim()) {
            newErrors.email = "Work email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = "Please enter a valid work email address.";
        }

        if (!organizationName.trim() || organizationName.trim().length < 2) {
            newErrors.organizationName = "Organization name must be at least 2 characters.";
        }

        const slug = organizationSlug.trim().toLowerCase();
        if (!slug || slug.length < 2) {
            newErrors.organizationSlug = "Organization identifier must be at least 2 characters.";
        } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            newErrors.organizationSlug = "Identifier can only contain lowercase letters, numbers, and hyphens.";
        }

        if (!password || password.length < 8) {
            newErrors.password = "Password must be at least 8 characters.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await signup({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                organizationName: organizationName.trim(),
                organizationSlug: organizationSlug.trim().toLowerCase(),
                password,
            });
            toast.success("Account Created", "Your enterprise workspace has been set up.");
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Unable to complete sign up. Please verify your details.";
            setErrors({ general: message });
            toast.error("Registration failed", message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
            {/* Brand Header */}
            <div className="flex flex-col items-center mb-6 text-center">
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#1E40AF] text-white font-bold text-xl shadow-xs mb-3">
                    D
                </div>
                <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
                    DealFlow<span className="text-[#1E40AF]">360</span>
                </h1>
                <p className="text-[13px] text-[#475569] mt-1">
                    Intelligent commercial deal operations & discount governance
                </p>
            </div>

            {/* Signup Card */}
            <Card className="w-full max-w-md shadow-xs border-[#E2E8F0]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold text-[#0F172A]">
                        Create your organization account
                    </CardTitle>
                    <CardDescription>
                        Set up your enterprise workspace or join an existing organization slug.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* General Server Error Banner */}
                    {errors.general && (
                        <div
                            role="alert"
                            className="p-3 mb-4 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px] leading-4 flex items-start gap-2"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="font-medium">{errors.general}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                        {/* Name Field */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                            >
                                Full Name
                            </label>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.name
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8]">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Sarah Jenkins"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                            >
                                Work Email
                            </label>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.email
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8]">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="sarah@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Organization Name Field */}
                        <div>
                            <label
                                htmlFor="organizationName"
                                className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                            >
                                Organization Name
                            </label>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.organizationName
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8]">
                                    <Building className="w-4 h-4" />
                                </div>
                                <input
                                    id="organizationName"
                                    name="organizationName"
                                    type="text"
                                    autoComplete="organization"
                                    placeholder="e.g. Acme Industrial"
                                    value={organizationName}
                                    onChange={handleOrgNameChange}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                            </div>
                            {errors.organizationName && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.organizationName}
                                </p>
                            )}
                        </div>

                        {/* Organization Slug Field */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="organizationSlug"
                                    className="block text-[12px] font-medium text-[#0F172A]"
                                >
                                    Organization Identifier (Slug)
                                </label>
                                <span className="text-[10px] text-[#64748B]">Used by team to sign in</span>
                            </div>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.organizationSlug
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8] text-[12px] font-mono select-none">
                                    dealflow/
                                </div>
                                <input
                                    id="organizationSlug"
                                    name="organizationSlug"
                                    type="text"
                                    placeholder="acme-industrial"
                                    value={organizationSlug}
                                    onChange={(e) => {
                                        setIsSlugManuallyEdited(true);
                                        setOrganizationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                                    }}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-1 text-[13px] font-mono text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                            </div>
                            {errors.organizationSlug && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.organizationSlug}
                                </p>
                            )}
                        </div>

                        {/* Password Field with Show/Hide Toggle */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                            >
                                Password
                            </label>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.password
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8]">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-2 pr-9 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-2.5 p-1 text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password ? (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.password}
                                </p>
                            ) : (
                                <p className="mt-1 text-[10px] leading-3 text-[#64748B]">
                                    Must contain at least 8 characters.
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full mt-2"
                            isLoading={isLoading}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Create Account
                        </Button>
                    </form>

                    {/* Secondary Navigation to Login */}
                    <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-center text-[12px] text-[#475569]">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-[#1E40AF] hover:underline"
                        >
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Enterprise Trust Footer */}
            <div className="flex items-center gap-1.5 mt-6 text-[11px] text-[#94A3B8]">
                <Shield className="w-3.5 h-3.5" />
                <span>Enterprise Deal Operations • Server-Governed Permissions</span>
            </div>
        </div>
    );
}
