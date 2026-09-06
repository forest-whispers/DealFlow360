"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { CustomerContextCard } from "@/components/quotations/customer-context-card";
import { CommercialSummaryCard } from "@/components/quotations/commercial-summary-card";
import { GovernancePanel } from "@/components/quotations/governance-panel";
import { ApprovalChain } from "@/components/approvals/approval-chain";
import { ApproveStepModal } from "@/components/approvals/approve-step-modal";
import { RejectStepModal } from "@/components/approvals/reject-step-modal";
import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
    APPROVAL_NAV_ROLES,
    APPROVAL_LEVEL_META,
} from "@/lib/constants";
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Lock,
    Package,
    Shield,
    XCircle,
} from "lucide-react";
import type { CanonicalQuotationResponse } from "@/server/modules/quotations/quotation.types";
import type {
    ApprovalRequestResponse,
    ApprovalStepResponse,
    QuotationApprovalHistoryResponse,
} from "@/server/modules/approvals/approval.types";

interface ApprovalDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
    const resolvedParams = use(params);
    const id = resolvedParams.id; // quotationId
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // Data State
    const [quotation, setQuotation] = useState<CanonicalQuotationResponse | null>(null);
    const [approvalHistory, setApprovalHistory] = useState<QuotationApprovalHistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Decision Modals State
    const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
    const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

    const isAuthorizedRole =
        currentUser && APPROVAL_NAV_ROLES.includes(currentUser.role);

    // Parallel fetch: Canonical Quotation + Approval History
    useEffect(() => {
        if (!isAuthorizedRole) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const [quotationData, approvalData] = await Promise.all([
                    apiClient.get<CanonicalQuotationResponse>(
                        API_ROUTES.QUOTATIONS.BY_ID(id)
                    ),
                    apiClient.get<QuotationApprovalHistoryResponse>(
                        API_ROUTES.QUOTATIONS.APPROVALS(id)
                    ),
                ]);

                if (isMounted) {
                    setQuotation(quotationData);
                    setApprovalHistory(approvalData);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to load quotation or approval details.";
                    setErrorMessage(msg);
                    setIsLoading(false);
                }
            }
        }, 50);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [id, isAuthorizedRole, refreshTrigger]);

    // Active Approval Request (the latest pending, or the most recent finalized request)
    const activeApprovalRequest: ApprovalRequestResponse | null = React.useMemo(() => {
        if (!approvalHistory || !approvalHistory.approvalRequests || approvalHistory.approvalRequests.length === 0) {
            return null;
        }
        const pending = approvalHistory.approvalRequests.find((r) => r.status === "PENDING");
        if (pending) return pending;
        return approvalHistory.approvalRequests[approvalHistory.approvalRequests.length - 1];
    }, [approvalHistory]);

    // Actionable Step: The first step with status === "PENDING" in the active request
    const actionableStep: ApprovalStepResponse | null = React.useMemo(() => {
        if (!activeApprovalRequest || activeApprovalRequest.status !== "PENDING") {
            return null;
        }
        return activeApprovalRequest.steps.find((s) => s.status === "PENDING") || null;
    }, [activeApprovalRequest]);

    // Role-based permission to act on the actionable step
    const canUserDecide = React.useMemo(() => {
        if (!activeApprovalRequest || activeApprovalRequest.status !== "PENDING" || !actionableStep || !currentUser) {
            return false;
        }
        if (currentUser.role === "ADMIN") return true;
        if (actionableStep.level === "SALES_MANAGER" && currentUser.role === "SALES_MANAGER") {
            return true;
        }
        if (actionableStep.level === "FINANCE_OPERATIONS" && currentUser.role === "FINANCE_OPERATIONS") {
            return true;
        }
        return false;
    }, [activeApprovalRequest, actionableStep, currentUser]);

    // Step Level Label for the actionable step
    const actionableLevelLabel = actionableStep
        ? APPROVAL_LEVEL_META[actionableStep.level]?.label || actionableStep.level
        : "Approval";

    // Handle Approve Step Action
    const handleApproveConfirm = async (reason?: string) => {
        if (!activeApprovalRequest) return;
        setIsSubmittingDecision(true);

        try {
            await apiClient.post(
                API_ROUTES.APPROVALS.APPROVE(activeApprovalRequest.id),
                { reason }
            );

            toast.success(
                "Step Approved",
                `Successfully approved the ${actionableLevelLabel} step.`
            );

            setIsApproveModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const status = (err as { status?: number })?.status;
            if (status === 409) {
                toast.warning(
                    "Concurrent Decision Detected",
                    "This approval has changed since you opened it. Refreshing latest state..."
                );
                setIsApproveModalOpen(false);
                setRefreshTrigger((prev) => prev + 1);
            } else if (status === 403) {
                toast.error(
                    "Permission Denied",
                    "You do not have authorization to approve this step."
                );
            } else {
                const msg = err instanceof Error ? err.message : "Failed to approve step.";
                toast.error("Approval Failed", msg);
            }
        } finally {
            setIsSubmittingDecision(false);
        }
    };

    // Handle Reject Step Action
    const handleRejectConfirm = async (reason: string) => {
        if (!activeApprovalRequest) return;
        setIsSubmittingDecision(true);

        try {
            await apiClient.post(
                API_ROUTES.APPROVALS.REJECT(activeApprovalRequest.id),
                { reason }
            );

            toast.error(
                "Quotation Rejected",
                "The quotation approval request was rejected."
            );

            setIsRejectModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
        } catch (err: unknown) {
            const status = (err as { status?: number })?.status;
            if (status === 409) {
                toast.warning(
                    "Concurrent Decision Detected",
                    "This approval has changed since you opened it. Refreshing latest state..."
                );
                setIsRejectModalOpen(false);
                setRefreshTrigger((prev) => prev + 1);
            } else if (status === 403) {
                toast.error(
                    "Permission Denied",
                    "You do not have authorization to reject this step."
                );
            } else {
                const msg = err instanceof Error ? err.message : "Failed to reject step.";
                toast.error("Rejection Failed", msg);
            }
        } finally {
            setIsSubmittingDecision(false);
        }
    };

    if (!isAuthorizedRole) {
        return (
            <div className="py-6">
                <ErrorState
                    title="Access Restricted"
                    message="You do not have permission to view or manage commercial approvals."
                />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6 pb-12">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-24 w-full rounded-lg" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-64 w-full rounded-lg" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (errorMessage || !quotation) {
        return (
            <div className="py-6 space-y-4">
                <Link
                    href="/approvals"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1E40AF] hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Approval Queue
                </Link>
                <ErrorState
                    title="Error Loading Approval"
                    message={errorMessage || "Quotation details could not be found."}
                    onRetry={() => setRefreshTrigger((prev) => prev + 1)}
                />
            </div>
        );
    }

    const currentRevision = quotation.revision;
    const isQuotationPending = quotation.status === "PENDING_APPROVAL";
    const isQuotationApproved = quotation.status === "APPROVED";
    const isQuotationRejected = quotation.status === "REJECTED";

    return (
        <div className="space-y-6 pb-16">
            {/* Breadcrumb Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                    <Link
                        href="/approvals"
                        className="hover:text-[#1E40AF] hover:underline flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Approvals</span>
                    </Link>
                    <span>/</span>
                    <span className="font-semibold text-[#0F172A]">
                        {quotation.quoteNumber}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                        Frozen Revision #{currentRevision.revisionNumber}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium">
                        <Lock className="w-3 h-3 text-[#94A3B8]" />
                        Immutable
                    </span>
                </div>
            </div>

            {/* Header Surface */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                            {quotation.quoteNumber}
                        </h1>
                        <StatusBadge type="quotation" status={quotation.status} />
                        {actionableStep && (
                            <Badge variant="warning" dot>
                                {actionableLevelLabel} Approval Required
                            </Badge>
                        )}
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-1">
                        Commercial approval review for{" "}
                        <strong className="text-[#0F172A] font-semibold">
                            {quotation.customer.name}
                        </strong>
                    </p>
                </div>

                {/* Header Action Summary */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                    {canUserDecide && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[#B91C1C] border-[#FECACA] hover:bg-[#FEF2F2]"
                                onClick={() => setIsRejectModalOpen(true)}
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Reject
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsApproveModalOpen(true)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                Approve Step
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Contextual Status Banner */}
            {isQuotationPending && actionableStep && (
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[13px]">
                    <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                    <div className="flex-1 leading-snug">
                        <span>
                            This deal is pending{" "}
                            <strong className="font-semibold text-[#78350F]">
                                {actionableLevelLabel}
                            </strong>{" "}
                            sign-off. Review the frozen commercial terms and governance evaluation below.
                        </span>
                    </div>
                </div>
            )}

            {isQuotationApproved && (
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-[13px]">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <div className="flex-1 leading-snug">
                        <span>
                            All required approval steps have been completed. This quotation is fully internal-approved and ready for customer dispatch.
                        </span>
                    </div>
                </div>
            )}

            {isQuotationRejected && (
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[13px]">
                    <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <div className="flex-1 leading-snug">
                        <span>
                            This quotation was rejected during approval review. All terms remain frozen in read-only audit state.
                        </span>
                    </div>
                </div>
            )}

            {/* Two-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2 Cols): Customer Context & Read-Only Quotation Lines */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Context Card */}
                    <CustomerContextCard
                        customer={quotation.customer}
                        customerActive={true}
                    />

                    {/* Frozen Quotation Lines Table */}
                    <Card className="border-[#E2E8F0]">
                        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
                            <CardTitle className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#1E40AF]" />
                                <span>Quotation Line Items</span>
                                <span className="text-[11px] font-normal text-[#64748B]">
                                    ({currentRevision.lines.length}{" "}
                                    {currentRevision.lines.length === 1 ? "item" : "items"})
                                </span>
                            </CardTitle>
                            <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-normal">
                                <Lock className="w-3 h-3 text-[#94A3B8]" />
                                Read-Only Revision
                            </span>
                        </CardHeader>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#F8FAFC]">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>Product / SKU</TableHead>
                                        <TableHead className="w-[100px]">Category</TableHead>
                                        <TableHead className="w-[70px] text-center">Qty</TableHead>
                                        <TableHead className="w-[110px] text-right">
                                            Unit Price
                                        </TableHead>
                                        <TableHead className="w-[90px] text-right">
                                            Discount
                                        </TableHead>
                                        <TableHead className="w-[120px] text-right">
                                            Line Total
                                        </TableHead>
                                        <TableHead className="w-[80px] text-right">
                                            Margin
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentRevision.lines.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-[12px] text-[#64748B] italic">
                                                No line items attached to this quotation revision.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentRevision.lines.map((line) => (
                                            <TableRow
                                                key={line.lineNumber}
                                                className="h-[44px] hover:bg-[#F8FAFC]/50"
                                            >
                                                <TableCell className="text-[#64748B] font-mono text-[12px]">
                                                    {line.lineNumber}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-[#0F172A] text-[13px]">
                                                            {line.name}
                                                        </span>
                                                        {line.sku && (
                                                            <span className="text-[11px] font-mono text-[#64748B]">
                                                                SKU: {line.sku}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="neutral" size="sm">
                                                        {line.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-medium text-[13px] text-[#0F172A]">
                                                    {line.quantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <FinancialNumeral
                                                        amount={line.unitPrice}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-mono text-[12px] ${
                                                        line.discountPercent > 0
                                                            ? "text-[#B45309] font-medium"
                                                            : "text-[#64748B]"
                                                    }`}>
                                                        {line.discountPercent.toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <FinancialNumeral
                                                        amount={line.lineTotal}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-mono text-[12px] font-medium ${
                                                            line.marginPercent < 10
                                                                ? "text-[#B91C1C]"
                                                                : line.marginPercent < 20
                                                                ? "text-[#B45309]"
                                                                : "text-[#047857]"
                                                        }`}
                                                    >
                                                        {line.marginPercent.toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* Right Column (1 Col): Approval Chain, Governance Context & Commercial Summary */}
                <div className="space-y-6">
                    {/* Approval Chain */}
                    <ApprovalChain
                        steps={activeApprovalRequest?.steps || []}
                        activeStepId={actionableStep?.id}
                    />

                    {/* Governance Panel */}
                    <GovernancePanel evaluation={currentRevision.evaluation} />

                    {/* Commercial Summary (Strictly Read-Only) */}
                    <CommercialSummaryCard
                        summary={currentRevision.summary}
                        orderDiscountPercent={currentRevision.orderDiscountPercent}
                        isReadOnly={true}
                    />
                </div>
            </div>

            {/* Bottom Decision Surface / Role Status Bar */}
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                    <Shield className="w-4 h-4 text-[#1E40AF]" />
                    {canUserDecide ? (
                        <span>
                            You are authorized to review and decide this{" "}
                            <strong className="text-[#0F172A] font-semibold">
                                {actionableLevelLabel}
                            </strong>{" "}
                            step.
                        </span>
                    ) : actionableStep ? (
                        <span>
                            Awaiting decision by{" "}
                            <strong className="text-[#0F172A] font-semibold">
                                {actionableLevelLabel}
                            </strong>
                            . Your current role ({currentUser?.role}) cannot decide this step.
                        </span>
                    ) : (
                        <span>
                            Workflow status:{" "}
                            <strong className="text-[#0F172A] font-semibold">
                                {activeApprovalRequest?.status || quotation.status}
                            </strong>
                            .
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Link href="/approvals">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                            Back to Queue
                        </Button>
                    </Link>

                    {canUserDecide && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-[#B91C1C] border-[#FECACA] hover:bg-[#FEF2F2]"
                                onClick={() => setIsRejectModalOpen(true)}
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Reject
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsApproveModalOpen(true)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                Approve Step
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Approve Step Confirmation Modal */}
            <ApproveStepModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                onConfirm={handleApproveConfirm}
                isSubmitting={isSubmittingDecision}
                levelLabel={actionableLevelLabel}
                quoteNumber={quotation.quoteNumber}
            />

            {/* Reject Step Confirmation Modal */}
            <RejectStepModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onConfirm={handleRejectConfirm}
                isSubmitting={isSubmittingDecision}
                levelLabel={actionableLevelLabel}
                quoteNumber={quotation.quoteNumber}
            />
        </div>
    );
}
