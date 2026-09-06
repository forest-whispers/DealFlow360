"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RoleGate } from "@/components/shared/role-gate";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
    DISCOUNT_GOVERNANCE_READ_ROLES,
    DISCOUNT_GOVERNANCE_MANAGE_ROLES,
} from "@/lib/constants";
import {
    AlertCircle,
    Archive,
    Award,
    Check,
    CheckCircle2,
    Layers,
    Plus,
    RotateCw,
    Shield,
    ShieldAlert,
    Sliders,
    Zap,
} from "lucide-react";
import type {
    DiscountTierRuleResponse,
    DiscountCategoryRuleResponse,
    DiscountApprovalPolicyResponse,
    CanonicalLineEvaluationResult,
} from "@/server/modules/discount-governance/discount-governance.types";

export default function DiscountGovernancePage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // Data State
    const [tierRules, setTierRules] = useState<DiscountTierRuleResponse[]>([]);
    const [categoryRules, setCategoryRules] = useState<DiscountCategoryRuleResponse[]>([]);
    const [approvalPolicy, setApprovalPolicy] = useState<DiscountApprovalPolicyResponse | null>(null);

    // Loading & Error States
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Policy Edit Modal
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
    const [salesManagerThreshold, setSalesManagerThreshold] = useState<number>(10);
    const [financeOperationsThreshold, setFinanceOperationsThreshold] = useState<number>(25);
    const [isSubmittingPolicy, setIsSubmittingPolicy] = useState<boolean>(false);
    const [policyError, setPolicyError] = useState<string | null>(null);

    // Tier Rule Modals
    const [isTierModalOpen, setIsTierModalOpen] = useState<boolean>(false);
    const [editingTierRule, setEditingTierRule] = useState<DiscountTierRuleResponse | null>(null);
    const [tierFormTier, setTierFormTier] = useState<"BRONZE" | "SILVER" | "GOLD">("BRONZE");
    const [tierFormPercent, setTierFormPercent] = useState<number>(10);
    const [tierFormActive, setTierFormActive] = useState<boolean>(true);
    const [isSubmittingTier, setIsSubmittingTier] = useState<boolean>(false);
    const [tierModalError, setTierModalError] = useState<string | null>(null);

    // Category Rule Modals
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
    const [editingCategoryRule, setEditingCategoryRule] = useState<DiscountCategoryRuleResponse | null>(null);
    const [categoryFormName, setCategoryFormName] = useState<string>("");
    const [categoryFormPercent, setCategoryFormPercent] = useState<number>(15);
    const [categoryFormActive, setCategoryFormActive] = useState<boolean>(true);
    const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);
    const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

    // Interactive Policy Sandbox State
    const [testTier, setTestTier] = useState<"BRONZE" | "SILVER" | "GOLD">("BRONZE");
    const [testCategory, setTestCategory] = useState<string>("");
    const [testDiscount, setTestDiscount] = useState<number>(12);
    const [testQty, setTestQty] = useState<number>(10);
    const [testResult, setTestResult] = useState<CanonicalLineEvaluationResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
    const [evalError, setEvalError] = useState<string | null>(null);

    const canManageRules = Boolean(
        currentUser &&
            (DISCOUNT_GOVERNANCE_MANAGE_ROLES as readonly string[]).includes(
                currentUser.role
            )
    );

    // Load initial authoritative rules and policy
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [tiersRes, catsRes, policyRes] = await Promise.all([
                    apiClient.listDiscountTierRules<{ tierRules: DiscountTierRuleResponse[] }>(),
                    apiClient.listDiscountCategoryRules<{ categoryRules: DiscountCategoryRuleResponse[] }>(),
                    apiClient.getDiscountApprovalPolicy<{ approvalPolicy: DiscountApprovalPolicyResponse }>(),
                ]);

                if (isMounted) {
                    setTierRules(tiersRes.tierRules || []);
                    const cats = catsRes.categoryRules || [];
                    setCategoryRules(cats);
                    if (cats.length > 0 && !testCategory) {
                        setTestCategory(cats[0].category);
                    }
                    if (policyRes?.approvalPolicy) {
                        setApprovalPolicy(policyRes.approvalPolicy);
                        setSalesManagerThreshold(policyRes.approvalPolicy.salesManagerThreshold);
                        setFinanceOperationsThreshold(policyRes.approvalPolicy.financeOperationsThreshold);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load discount governance configuration.";
                    setError(msg);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [refreshTrigger]);

    // Handle Approval Policy Update
    const handleUpdatePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (salesManagerThreshold > financeOperationsThreshold) {
            setPolicyError("Sales Manager threshold cannot exceed Finance Operations threshold.");
            return;
        }

        setIsSubmittingPolicy(true);
        setPolicyError(null);

        try {
            const res = await apiClient.updateDiscountApprovalPolicy<{
                approvalPolicy: DiscountApprovalPolicyResponse;
            }>({
                salesManagerThreshold: Number(salesManagerThreshold),
                financeOperationsThreshold: Number(financeOperationsThreshold),
            });

            setApprovalPolicy(res.approvalPolicy);
            toast.success("Policy Updated", "Global discount approval thresholds updated successfully.");
            setIsPolicyModalOpen(false);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Failed to update discount approval policy.";
            setPolicyError(msg);
            toast.error("Update Failed", msg);
        } finally {
            setIsSubmittingPolicy(false);
        }
    };

    // Open Add Tier Rule
    const openCreateTierModal = () => {
        setEditingTierRule(null);
        setTierFormTier("BRONZE");
        setTierFormPercent(10);
        setTierFormActive(true);
        setTierModalError(null);
        setIsTierModalOpen(true);
    };

    // Open Edit Tier Rule
    const openEditTierModal = (rule: DiscountTierRuleResponse) => {
        setEditingTierRule(rule);
        setTierFormTier(rule.customerTier as "BRONZE" | "SILVER" | "GOLD");
        setTierFormPercent(rule.maximumDiscountPercent);
        setTierFormActive(rule.isActive);
        setTierModalError(null);
        setIsTierModalOpen(true);
    };

    // Handle Save Tier Rule (Create or Update)
    const handleSaveTierRule = async (e: React.FormEvent) => {
        e.preventDefault();

        if (tierFormPercent < 0 || tierFormPercent > 100) {
            setTierModalError("Discount percentage must be between 0% and 100%.");
            return;
        }

        setIsSubmittingTier(true);
        setTierModalError(null);

        try {
            if (editingTierRule) {
                await apiClient.updateDiscountTierRule(editingTierRule.id, {
                    maximumDiscountPercent: Number(tierFormPercent),
                    isActive: tierFormActive,
                });
                toast.success("Rule Updated", `Updated ${editingTierRule.customerTier} tier ceiling to ${tierFormPercent}%.`);
            } else {
                await apiClient.createDiscountTierRule({
                    customerTier: tierFormTier,
                    maximumDiscountPercent: Number(tierFormPercent),
                });
                toast.success("Rule Created", `Created ${tierFormTier} tier rule (${tierFormPercent}% max).`);
            }

            setIsTierModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to save tier discount rule.";
            setTierModalError(msg);
            toast.error("Action Failed", msg);
        } finally {
            setIsSubmittingTier(false);
        }
    };

    // Archive Tier Rule
    const handleArchiveTierRule = async (rule: DiscountTierRuleResponse) => {
        if (!confirm(`Archive tier rule for ${rule.customerTier}?`)) return;

        try {
            await apiClient.archiveDiscountTierRule(rule.id);
            toast.success("Rule Archived", `Archived ${rule.customerTier} rule.`);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to archive tier rule.";
            toast.error("Archive Failed", msg);
        }
    };

    // Open Add Category Rule
    const openCreateCategoryModal = () => {
        setEditingCategoryRule(null);
        setCategoryFormName("");
        setCategoryFormPercent(15);
        setCategoryFormActive(true);
        setCategoryModalError(null);
        setIsCategoryModalOpen(true);
    };

    // Open Edit Category Rule
    const openEditCategoryModal = (rule: DiscountCategoryRuleResponse) => {
        setEditingCategoryRule(rule);
        setCategoryFormName(rule.category);
        setCategoryFormPercent(rule.maximumDiscountPercent);
        setCategoryFormActive(rule.isActive);
        setCategoryModalError(null);
        setIsCategoryModalOpen(true);
    };

    // Handle Save Category Rule (Create or Update)
    const handleSaveCategoryRule = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmed = categoryFormName.trim();
        if (!editingCategoryRule && !trimmed) {
            setCategoryModalError("Product category name is required.");
            return;
        }

        if (categoryFormPercent < 0 || categoryFormPercent > 100) {
            setCategoryModalError("Discount percentage must be between 0% and 100%.");
            return;
        }

        setIsSubmittingCategory(true);
        setCategoryModalError(null);

        try {
            if (editingCategoryRule) {
                await apiClient.updateDiscountCategoryRule(editingCategoryRule.id, {
                    maximumDiscountPercent: Number(categoryFormPercent),
                    isActive: categoryFormActive,
                });
                toast.success("Rule Updated", `Updated category ${editingCategoryRule.category} ceiling to ${categoryFormPercent}%.`);
            } else {
                await apiClient.createDiscountCategoryRule({
                    category: trimmed,
                    maximumDiscountPercent: Number(categoryFormPercent),
                });
                toast.success("Rule Created", `Created category rule for ${trimmed} (${categoryFormPercent}% max).`);
            }

            setIsCategoryModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to save category rule.";
            setCategoryModalError(msg);
            toast.error("Action Failed", msg);
        } finally {
            setIsSubmittingCategory(false);
        }
    };

    // Archive Category Rule
    const handleArchiveCategoryRule = async (rule: DiscountCategoryRuleResponse) => {
        if (!confirm(`Archive rule for category "${rule.category}"?`)) return;

        try {
            await apiClient.archiveDiscountCategoryRule(rule.id);
            toast.success("Rule Archived", `Archived category "${rule.category}".`);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to archive category rule.";
            toast.error("Archive Failed", msg);
        }
    };

    // Live Sandbox Rule Evaluation
    const handleEvaluateSandbox = async () => {
        setIsEvaluating(true);
        setEvalError(null);
        setTestResult(null);

        try {
            // Find a dummy or active product for testing evaluation line
            const res = await apiClient.evaluateDiscountLine<{
                evaluation: CanonicalLineEvaluationResult;
                status: string;
                approvalLevel: string;
                effectiveLimit: number;
                message: string | null;
            }>({
                customerTier: testTier,
                line: {
                    lineId: 1,
                    productId: "test-product-id",
                    quantity: Number(testQty) || 1,
                    discountPercent: Number(testDiscount),
                },
            });

            if (res.evaluation) {
                setTestResult(res.evaluation);
            } else {
                setTestResult({
                    lineId: 1,
                    status: res.status as CanonicalLineEvaluationResult["status"],
                    approvalLevel: res.approvalLevel as CanonicalLineEvaluationResult["approvalLevel"],
                    effectiveLimit: res.effectiveLimit,
                    message: res.message,
                });
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Evaluation failed.";
            setEvalError(msg);
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <RoleGate
            allowedRoles={[...DISCOUNT_GOVERNANCE_READ_ROLES]}
            fallback={
                <div className="py-12 text-center text-[#64748B] text-[14px]">
                    Access Restricted: You do not have permission to view Discount Governance policies.
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    title="Discount Governance & Approval Policies"
                    description="Commercial pricing limits, customer tier discount ceilings, and approval workflow escalation thresholds."
                    breadcrumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Configuration", href: "/discount-governance" },
                        { label: "Discount Governance" },
                    ]}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                                onClick={() => setRefreshTrigger((p) => p + 1)}
                                isLoading={isLoading}
                            >
                                Refresh
                            </Button>
                            {canManageRules && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Sliders className="w-3.5 h-3.5" />}
                                    onClick={() => setIsPolicyModalOpen(true)}
                                >
                                    Edit Thresholds
                                </Button>
                            )}
                        </div>
                    }
                />

                {error && (
                    <ErrorState
                        title="Failed to Load Governance Policies"
                        message={error}
                        onRetry={() => setRefreshTrigger((p) => p + 1)}
                    />
                )}

                {/* Section 1: Approval Escalation Thresholds */}
                <Card className="border-[#E2E8F0] shadow-xs">
                    <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-[#1E40AF]" />
                                Global Approval Escalation Policy
                            </CardTitle>
                            <p className="text-[12px] text-[#64748B] mt-0.5">
                                Hierarchical discount thresholds triggering mandatory review before customer dispatch.
                            </p>
                        </div>
                        {canManageRules && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPolicyModalOpen(true)}
                            >
                                Configure Thresholds
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Standard Floor */}
                            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-medium text-[#64748B]">Auto-Approved</span>
                                    <Badge variant="success" size="sm">Standard Rep Limit</Badge>
                                </div>
                                <div className="text-[24px] font-bold text-[#0F172A]">
                                    0% — {approvalPolicy?.salesManagerThreshold ?? 10}%
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                    Discounts within customer tier and category limits require no manager sign-off.
                                </p>
                            </div>

                            {/* Sales Manager Authority */}
                            <div className="p-4 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-[#1E40AF]">Sales Manager Sign-Off</span>
                                    <Badge variant="info" size="sm">Level 1</Badge>
                                </div>
                                <div className="text-[24px] font-bold text-[#1E40AF]">
                                    &gt; {approvalPolicy?.salesManagerThreshold ?? 10}% up to {approvalPolicy?.financeOperationsThreshold ?? 25}%
                                </div>
                                <p className="text-[11px] text-[#3B82F6]">
                                    Escalates automatically to Sales Manager when rep proposes higher concession.
                                </p>
                            </div>

                            {/* Finance & Operations Authority */}
                            <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-[#991B1B]">Finance & Operations Sign-Off</span>
                                    <Badge variant="danger" size="sm">Level 2 (Executive)</Badge>
                                </div>
                                <div className="text-[24px] font-bold text-[#991B1B]">
                                    &gt; {approvalPolicy?.financeOperationsThreshold ?? 25}%
                                </div>
                                <p className="text-[11px] text-[#DC2626]">
                                    Deep concessions require Finance/Operations controller review prior to quoting.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Two-Column Rules Grid (Tier Rules vs Category Rules) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Customer Tier Rules */}
                    <Card className="border-[#E2E8F0] shadow-xs">
                        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Award className="w-4 h-4 text-[#1E40AF]" />
                                    Customer Tier Discount Rules
                                </CardTitle>
                                <p className="text-[12px] text-[#64748B] mt-0.5">
                                    Maximum baseline discounts governed by customer account status.
                                </p>
                            </div>
                            {canManageRules && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={openCreateTierModal}
                                >
                                    Add Rule
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-4">
                                    <Table>
                                        <TableBody>
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <TableRowSkeleton key={i} columns={4} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : tierRules.length === 0 ? (
                                <div className="p-8">
                                    <EmptyState
                                        icon={<Award className="w-8 h-8 text-[#94A3B8]" />}
                                        title="No Tier Rules Configured"
                                        description="No customer tier limits defined yet. Default fallback policy applies."
                                    />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#F8FAFC]">
                                            <TableHead className="font-semibold text-[#0F172A]">Customer Tier</TableHead>
                                            <TableHead className="w-28 text-right font-semibold text-[#0F172A]">Max Limit</TableHead>
                                            <TableHead className="w-24 text-center font-semibold text-[#0F172A]">Status</TableHead>
                                            {canManageRules && <TableHead className="w-28 text-right font-semibold text-[#0F172A]">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tierRules.map((rule) => (
                                            <TableRow key={rule.id} className="hover:bg-[#F8FAFC]/70">
                                                <TableCell className="font-medium text-[13px] text-[#0F172A]">
                                                    <Badge
                                                        variant={
                                                            rule.customerTier === "GOLD"
                                                                ? "warning"
                                                                : rule.customerTier === "SILVER"
                                                                ? "info"
                                                                : "neutral"
                                                        }
                                                        size="sm"
                                                    >
                                                        {rule.customerTier}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-[13px] text-[#0F172A]">
                                                    {rule.maximumDiscountPercent}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={rule.isActive ? "success" : "neutral"} size="sm">
                                                        {rule.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                {canManageRules && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[12px]"
                                                                onClick={() => openEditTierModal(rule)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[12px] text-[#DC2626] hover:text-[#B91C1C]"
                                                                onClick={() => handleArchiveTierRule(rule)}
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Product Category Rules */}
                    <Card className="border-[#E2E8F0] shadow-xs">
                        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[#1E40AF]" />
                                    Product Category Discount Rules
                                </CardTitle>
                                <p className="text-[12px] text-[#64748B] mt-0.5">
                                    Specific category discount ceilings (e.g. Hardware vs Software vs Services).
                                </p>
                            </div>
                            {canManageRules && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={openCreateCategoryModal}
                                >
                                    Add Rule
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-4">
                                    <Table>
                                        <TableBody>
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <TableRowSkeleton key={i} columns={4} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : categoryRules.length === 0 ? (
                                <div className="p-8">
                                    <EmptyState
                                        icon={<Layers className="w-8 h-8 text-[#94A3B8]" />}
                                        title="No Category Rules Configured"
                                        description="No product category ceilings registered. Default customer tier rules govern."
                                    />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#F8FAFC]">
                                            <TableHead className="font-semibold text-[#0F172A]">Category</TableHead>
                                            <TableHead className="w-28 text-right font-semibold text-[#0F172A]">Max Limit</TableHead>
                                            <TableHead className="w-24 text-center font-semibold text-[#0F172A]">Status</TableHead>
                                            {canManageRules && <TableHead className="w-28 text-right font-semibold text-[#0F172A]">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categoryRules.map((rule) => (
                                            <TableRow key={rule.id} className="hover:bg-[#F8FAFC]/70">
                                                <TableCell className="font-medium text-[13px] text-[#0F172A]">
                                                    {rule.category}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-[13px] text-[#0F172A]">
                                                    {rule.maximumDiscountPercent}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={rule.isActive ? "success" : "neutral"} size="sm">
                                                        {rule.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                {canManageRules && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[12px]"
                                                                onClick={() => openEditCategoryModal(rule)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[12px] text-[#DC2626] hover:text-[#B91C1C]"
                                                                onClick={() => handleArchiveCategoryRule(rule)}
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Section 3: Interactive Live Discount Policy Sandbox */}
                <Card className="border-[#E2E8F0] shadow-xs">
                    <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                        <CardTitle className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#1E40AF]" />
                            Live Policy Sandbox
                        </CardTitle>
                        <p className="text-[12px] text-[#64748B] mt-0.5">
                            Test hypothetical discount proposals against the live backend governance engine.
                        </p>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1">
                                <label className="text-[12px] font-medium text-[#0F172A]">Customer Tier</label>
                                <Select
                                    value={testTier}
                                    onChange={(e) => setTestTier(e.target.value as "BRONZE" | "SILVER" | "GOLD")}
                                >
                                    <option value="BRONZE">Bronze Tier</option>
                                    <option value="SILVER">Silver Tier</option>
                                    <option value="GOLD">Gold Tier</option>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-medium text-[#0F172A]">Quantity Units</label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={testQty}
                                    onChange={(e) => setTestQty(parseInt(e.target.value, 10) || 1)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-medium text-[#0F172A]">Proposed Discount (%)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={testDiscount}
                                    onChange={(e) => setTestDiscount(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleEvaluateSandbox}
                                isLoading={isEvaluating}
                                leftIcon={<Shield className="w-4 h-4" />}
                            >
                                Evaluate Discount
                            </Button>
                        </div>

                        {/* Test Evaluation Feedback */}
                        {evalError && (
                            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[12px] text-[#B91C1C]">
                                {evalError}
                            </div>
                        )}

                        {testResult && (
                            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {testResult.status === "WITHIN_LIMIT" ? (
                                            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-[#D97706]" />
                                        )}
                                        <span className="font-semibold text-[13px] text-[#0F172A]">
                                            Engine Result: {testResult.status}
                                        </span>
                                    </div>
                                    <Badge
                                        variant={
                                            testResult.status === "WITHIN_LIMIT"
                                                ? "success"
                                                : testResult.status === "APPROVAL_REQUIRED"
                                                ? "warning"
                                                : "danger"
                                        }
                                    >
                                        {testResult.approvalLevel === "NONE"
                                            ? "Within Policy (Auto-Approved)"
                                            : `Requires ${testResult.approvalLevel}`}
                                    </Badge>
                                </div>
                                <p className="text-[12px] text-[#475569]">
                                    {testResult.message || `Evaluated against effective limit of ${testResult.effectiveLimit}%.`}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modal: Edit Global Approval Thresholds */}
                <Modal
                    isOpen={isPolicyModalOpen}
                    onClose={() => setIsPolicyModalOpen(false)}
                    title="Edit Global Approval Thresholds"
                    description="Configure escalation limits for managerial and finance sign-offs."
                    maxWidth="md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setIsPolicyModalOpen(false)}
                                disabled={isSubmittingPolicy}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleUpdatePolicy}
                                isLoading={isSubmittingPolicy}
                                leftIcon={<Check className="w-4 h-4" />}
                            >
                                Save Policy
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleUpdatePolicy} className="space-y-4 pt-1">
                        {policyError && (
                            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px]">
                                {policyError}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#0F172A] block">
                                Sales Manager Threshold (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={salesManagerThreshold}
                                onChange={(e) => setSalesManagerThreshold(parseFloat(e.target.value) || 0)}
                                disabled={isSubmittingPolicy}
                                helperText="Discounts exceeding this percent will require Sales Manager sign-off."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#0F172A] block">
                                Finance & Operations Threshold (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={financeOperationsThreshold}
                                onChange={(e) => setFinanceOperationsThreshold(parseFloat(e.target.value) || 0)}
                                disabled={isSubmittingPolicy}
                                helperText="Discounts exceeding this percent escalate to Finance & Operations."
                            />
                        </div>
                    </form>
                </Modal>

                {/* Modal: Add/Edit Customer Tier Rule */}
                <Modal
                    isOpen={isTierModalOpen}
                    onClose={() => setIsTierModalOpen(false)}
                    title={editingTierRule ? `Edit ${editingTierRule.customerTier} Tier Rule` : "Create Customer Tier Rule"}
                    description="Set maximum baseline discount ceiling for customer tier accounts."
                    maxWidth="md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setIsTierModalOpen(false)}
                                disabled={isSubmittingTier}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveTierRule}
                                isLoading={isSubmittingTier}
                                leftIcon={<Check className="w-4 h-4" />}
                            >
                                {editingTierRule ? "Update Rule" : "Create Rule"}
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleSaveTierRule} className="space-y-4 pt-1">
                        {tierModalError && (
                            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px]">
                                {tierModalError}
                            </div>
                        )}

                        {!editingTierRule ? (
                            <div className="space-y-1">
                                <label className="text-[13px] font-medium text-[#0F172A] block">Customer Tier</label>
                                <Select
                                    value={tierFormTier}
                                    onChange={(e) => setTierFormTier(e.target.value as "BRONZE" | "SILVER" | "GOLD")}
                                    disabled={isSubmittingTier}
                                >
                                    <option value="BRONZE">Bronze Tier</option>
                                    <option value="SILVER">Silver Tier</option>
                                    <option value="GOLD">Gold Tier</option>
                                </Select>
                            </div>
                        ) : (
                            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold text-[#0F172A]">
                                Editing Tier: {editingTierRule.customerTier}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#0F172A] block">
                                Maximum Discount Ceiling (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={tierFormPercent}
                                onChange={(e) => setTierFormPercent(parseFloat(e.target.value) || 0)}
                                disabled={isSubmittingTier}
                            />
                        </div>

                        {editingTierRule && (
                            <div className="space-y-1">
                                <label className="text-[13px] font-medium text-[#0F172A] block">Rule Status</label>
                                <Select
                                    value={tierFormActive ? "true" : "false"}
                                    onChange={(e) => setTierFormActive(e.target.value === "true")}
                                    disabled={isSubmittingTier}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </Select>
                            </div>
                        )}
                    </form>
                </Modal>

                {/* Modal: Add/Edit Category Rule */}
                <Modal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    title={editingCategoryRule ? `Edit Category Rule: ${editingCategoryRule.category}` : "Create Category Rule"}
                    description="Set maximum baseline discount ceiling for a specific product category."
                    maxWidth="md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setIsCategoryModalOpen(false)}
                                disabled={isSubmittingCategory}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveCategoryRule}
                                isLoading={isSubmittingCategory}
                                leftIcon={<Check className="w-4 h-4" />}
                            >
                                {editingCategoryRule ? "Update Rule" : "Create Rule"}
                            </Button>
                        </div>
                    }
                >
                    <form onSubmit={handleSaveCategoryRule} className="space-y-4 pt-1">
                        {categoryModalError && (
                            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12px]">
                                {categoryModalError}
                            </div>
                        )}

                        {!editingCategoryRule ? (
                            <div className="space-y-1">
                                <label className="text-[13px] font-medium text-[#0F172A] block">
                                    Product Category Name
                                </label>
                                <Input
                                    placeholder="e.g. Hardware, Software, Services"
                                    value={categoryFormName}
                                    onChange={(e) => setCategoryFormName(e.target.value)}
                                    disabled={isSubmittingCategory}
                                />
                            </div>
                        ) : (
                            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold text-[#0F172A]">
                                Category: {editingCategoryRule.category}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#0F172A] block">
                                Maximum Discount Ceiling (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={categoryFormPercent}
                                onChange={(e) => setCategoryFormPercent(parseFloat(e.target.value) || 0)}
                                disabled={isSubmittingCategory}
                            />
                        </div>

                        {editingCategoryRule && (
                            <div className="space-y-1">
                                <label className="text-[13px] font-medium text-[#0F172A] block">Rule Status</label>
                                <Select
                                    value={categoryFormActive ? "true" : "false"}
                                    onChange={(e) => setCategoryFormActive(e.target.value === "true")}
                                    disabled={isSubmittingCategory}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </Select>
                            </div>
                        )}
                    </form>
                </Modal>
            </div>
        </RoleGate>
    );
}
