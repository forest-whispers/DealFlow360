"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, ArrowRight, Lock, Mail, Building, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export default function LoginPage() {
    const { login } = useAuth();
    const { toast } = useToast();

    const [organizationSlug, setOrganizationSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form errors
    const [errors, setErrors] = useState<{
        organizationSlug?: string;
        email?: string;
        password?: string;
        general?: string;
    }>({});

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!organizationSlug.trim()) {
            newErrors.organizationSlug = "Organization identifier is required.";
        }

        if (!email.trim()) {
            newErrors.email = "Work email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = "Please enter a valid work email address.";
        }

        if (!password) {
            newErrors.password = "Password is required.";
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
            await login({
                organizationSlug: organizationSlug.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password,
            });
            toast.success("Welcome back", "Authenticated successfully.");
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Invalid credentials or organization. Please check your details.";
            setErrors({ general: message });
            toast.error("Sign in failed", message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
            {/* Brand Header */}
            <div className="flex flex-col items-center mb-8 text-center">
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#1E40AF] text-white font-bold text-xl shadow-xs mb-3">
                    D
                </div>
                <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
                    DealFlow<span className="text-[#1E40AF]">360</span>
                </h1>
                <p className="text-[13px] text-[#475569] mt-1">
                    Commercial operations & intelligent deal copilot
                </p>
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-md shadow-xs border-[#E2E8F0]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold text-[#0F172A]">
                        Sign in to your organization
                    </CardTitle>
                    <CardDescription>
                        Enter your enterprise credentials to access your commercial workspace.
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

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {/* Organization Slug Field */}
                        <div>
                            <label
                                htmlFor="organizationSlug"
                                className="block text-[12px] font-medium text-[#0F172A] mb-1.5"
                            >
                                Organization Identifier
                            </label>
                            <div
                                className={cn(
                                    "relative flex items-center w-full rounded-md border bg-white transition-colors duration-150",
                                    errors.organizationSlug
                                        ? "border-[#FECACA] focus-within:ring-2 focus-within:ring-[#B91C1C]"
                                        : "border-[#CBD5E1] focus-within:ring-2 focus-within:ring-[#1E40AF]",
                                    isLoading && "bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed opacity-75"
                                )}
                            >
                                <div className="flex items-center pl-3 pr-1 text-[#94A3B8]">
                                    <Building className="w-4 h-4" />
                                </div>
                                <input
                                    id="organizationSlug"
                                    name="organizationSlug"
                                    type="text"
                                    autoComplete="organization"
                                    placeholder="e.g. acme"
                                    value={organizationSlug}
                                    onChange={(e) => setOrganizationSlug(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-transparent px-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:cursor-not-allowed"
                                />
                            </div>
                            {errors.organizationSlug && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.organizationSlug}
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
                                    placeholder="name@company.com"
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
                                    autoComplete="current-password"
                                    placeholder="••••••••••••"
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
                            {errors.password && (
                                <p className="mt-1 text-[11px] leading-4 text-[#B91C1C] font-medium">
                                    {errors.password}
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
                            Sign In
                        </Button>
                    </form>

                    {/* Secondary Navigation to Signup */}
                    <div className="mt-5 pt-4 border-t border-[#F1F5F9] text-center text-[12px] text-[#475569]">
                        Don&apos;t have an organization account?{" "}
                        <Link
                            href="/signup"
                            className="font-semibold text-[#1E40AF] hover:underline"
                        >
                            Create an account
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Enterprise Trust Footer */}
            <div className="flex items-center gap-1.5 mt-8 text-[11px] text-[#94A3B8]">
                <Shield className="w-3.5 h-3.5" />
                <span>Protected by DealFlow360 Enterprise Access Governance</span>
            </div>
        </div>
    );
}
