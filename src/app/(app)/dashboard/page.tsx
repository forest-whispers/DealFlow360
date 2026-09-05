"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableFooter,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/toast-context";
import {
    Sparkles,
    FileText,
    PanelRight,
} from "lucide-react";

export default function DashboardPage() {
    const { toast } = useToast();

    // Modal & Drawer interactive state for testing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(false);

    return (
        <div className="space-y-8">
            {/* Standard Page Header */}
            <PageHeader
                title="Commercial Operations Dashboard"
                description="Phase 1 Foundation: Enterprise Application Shell, Reusable Design System, and Typography Baseline."
                breadcrumbs={[
                    { label: "DealFlow360", href: "/dashboard" },
                    { label: "Commercial Operations" },
                    { label: "Overview" },
                ]}
                badge={
                    <StatusBadge type="quotation" status="CONFIRMED" />
                }
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDrawerOpen(true)}
                            leftIcon={<PanelRight className="w-3.5 h-3.5" />}
                        >
                            Open Drawer
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsModalOpen(true)}
                            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                        >
                            Test Dialog
                        </Button>
                    </div>
                }
            />

            {/* Design System Verification & Live Tokens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric Card 1: Display Metric */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-[#475569]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                Active Deal Volume
                            </span>
                            <StatusBadge type="deal-health" status="HEALTHY" size="sm" />
                        </div>
                        <div>
                            <FinancialNumeral
                                amount={2485000}
                                currency="INR"
                                variant="display"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            4 quotations pending customer confirmation
                        </p>
                    </CardContent>
                </Card>

                {/* Metric Card 2: Approval Queue */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-[#475569]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                Approval Queue
                            </span>
                            <StatusBadge type="quotation" status="PENDING_APPROVAL" size="sm" />
                        </div>
                        <div>
                            <FinancialNumeral
                                amount={680000}
                                currency="INR"
                                variant="display"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#B45309] font-medium">
                            2 high-discount requests need Sales Manager action
                        </p>
                    </CardContent>
                </Card>

                {/* Metric Card 3: Negotiation Rate */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-[#475569]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                Blended Margin
                            </span>
                            <StatusBadge type="deal-health" status="WATCH" size="sm" />
                        </div>
                        <div>
                            <FinancialNumeral
                                rate={34.2}
                                type="percentage"
                                variant="display"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#475569]">
                            Target baseline is 35.0% for Silver Tier
                        </p>
                    </CardContent>
                </Card>

                {/* Metric Card 4: Fulfillment Progress */}
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-[#475569]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                Fulfillment Allocation
                            </span>
                            <StatusBadge type="fulfillment" status="ALLOCATED" size="sm" />
                        </div>
                        <div>
                            <FinancialNumeral
                                amount={1420}
                                type="quantity"
                                variant="display"
                                suffix=" units"
                            />
                        </div>
                        <p className="text-[11px] leading-4 text-[#047857] font-medium">
                            All lines allocated from Central Warehouse
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Semantic Status System Matrix */}
            <Card>
                <CardHeader>
                    <CardTitle>Consistent Semantic Status Language</CardTitle>
                    <CardDescription>
                        Unified status badges using restrained tinted backgrounds, matching borders, and high-contrast typography.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Quotation Statuses */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Quotation Lifecycle
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <StatusBadge type="quotation" status="DRAFT" />
                                <StatusBadge type="quotation" status="PENDING_APPROVAL" />
                                <StatusBadge type="quotation" status="APPROVED" />
                                <StatusBadge type="quotation" status="SENT" />
                                <StatusBadge type="quotation" status="UNDER_NEGOTIATION" />
                                <StatusBadge type="quotation" status="CONFIRMED" />
                                <StatusBadge type="quotation" status="REJECTED" />
                            </div>
                        </div>

                        {/* Deal Health Statuses */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Deal Health
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <StatusBadge type="deal-health" status="HEALTHY" />
                                <StatusBadge type="deal-health" status="WATCH" />
                                <StatusBadge type="deal-health" status="AT_RISK" />
                                <StatusBadge type="deal-health" status="CRITICAL" />
                            </div>
                        </div>

                        {/* Fulfillment Statuses */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Fulfillment Operations
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <StatusBadge type="fulfillment" status="PENDING" />
                                <StatusBadge type="fulfillment" status="PARTIALLY_ALLOCATED" />
                                <StatusBadge type="fulfillment" status="ALLOCATED" />
                                <StatusBadge type="fulfillment" status="IN_PROGRESS" />
                                <StatusBadge type="fulfillment" status="FULFILLED" />
                            </div>
                        </div>

                        {/* Billing & Customer Tier */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                                Billing & Account Tier
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <StatusBadge type="billing" status="PENDING" />
                                <StatusBadge type="billing" status="PAID" />
                                <StatusBadge type="tier" status="GOLD" />
                                <StatusBadge type="tier" status="SILVER" />
                                <StatusBadge type="tier" status="BRONZE" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Enterprise Dense Table Example */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Enterprise Table Component</CardTitle>
                        <CardDescription>
                            Standard 44px rows, 11px uppercase tracked headers, right-aligned financial tabular numbers, and quiet hover transitions.
                        </CardDescription>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSkeletons((prev) => !prev)}
                    >
                        {showSkeletons ? "Show Sample Data" : "Preview Skeleton Loaders"}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quotation #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead align="right">List Price</TableHead>
                                <TableHead align="right">Discount</TableHead>
                                <TableHead align="right">Net Total</TableHead>
                                <TableHead align="right">Margin</TableHead>
                                <TableHead>Deal Health</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {showSkeletons ? (
                                <>
                                    <TableRowSkeleton columns={9} />
                                    <TableRowSkeleton columns={9} />
                                    <TableRowSkeleton columns={9} />
                                </>
                            ) : (
                                <>
                                    <TableRow isClickable>
                                        <TableCell className="font-semibold text-[#1E40AF]">
                                            QT-2026-0891
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            Tata Consultancy Solutions
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="tier" status="GOLD" size="sm" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="quotation" status="UNDER_NEGOTIATION" size="sm" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral amount={850000} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={12.0} type="percentage" coloredDelta />
                                        </TableCell>
                                        <TableCell isNumeric className="font-semibold">
                                            <FinancialNumeral amount={748000} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={38.5} type="percentage" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="deal-health" status="HEALTHY" size="sm" />
                                        </TableCell>
                                    </TableRow>

                                    <TableRow isClickable>
                                        <TableCell className="font-semibold text-[#1E40AF]">
                                            QT-2026-0892
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            Reliance Retail Logistics
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="tier" status="SILVER" size="sm" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="quotation" status="PENDING_APPROVAL" size="sm" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral amount={1200000} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={24.0} type="percentage" coloredDelta />
                                        </TableCell>
                                        <TableCell isNumeric className="font-semibold">
                                            <FinancialNumeral amount={912000} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={22.4} type="percentage" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="deal-health" status="WATCH" size="sm" />
                                        </TableCell>
                                    </TableRow>

                                    <TableRow isClickable>
                                        <TableCell className="font-semibold text-[#1E40AF]">
                                            QT-2026-0893
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            Infosys Enterprise Services
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="tier" status="GOLD" size="sm" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="quotation" status="CONFIRMED" size="sm" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral amount={640000} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={8.5} type="percentage" coloredDelta />
                                        </TableCell>
                                        <TableCell isNumeric className="font-semibold">
                                            <FinancialNumeral amount={585600} currency="INR" />
                                        </TableCell>
                                        <TableCell isNumeric>
                                            <FinancialNumeral rate={42.1} type="percentage" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="deal-health" status="HEALTHY" size="sm" />
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={6} className="text-right font-semibold">
                                    Total Commercial Value
                                </TableCell>
                                <TableCell isNumeric className="font-bold text-[#1E40AF]">
                                    <FinancialNumeral amount={2245600} currency="INR" variant="subtotal" />
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            {/* Reusable Form Controls & Operational Buttons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Operational Form Controls</CardTitle>
                        <CardDescription>
                            Standard 36px controls with focus ring #1E40AF and prefix/suffix support.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                                    Base Unit Price
                                </label>
                                <Input
                                    type="number"
                                    defaultValue="12500"
                                    prefixText="₹"
                                    isNumeric
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                                    Target Discount %
                                </label>
                                <Input
                                    type="number"
                                    defaultValue="15.0"
                                    suffixText="%"
                                    isNumeric
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                                Fulfillment Warehouse
                            </label>
                            <Select defaultValue="central">
                                <option value="central">Central Distribution Center (Bhiwandi)</option>
                                <option value="south">South Hub (Bengaluru)</option>
                                <option value="north">North Logistics Hub (Noida)</option>
                            </Select>
                        </div>

                        <div className="pt-2">
                            <Checkbox
                                id="apply-governance"
                                label="Automatic Governance Pre-Evaluation"
                                description="Check quotation against customer tier limits before submitting"
                                defaultChecked
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications & System Feedback */}
                <Card>
                    <CardHeader>
                        <CardTitle>Interactive System Feedback & Toasts</CardTitle>
                        <CardDescription>
                            Test system feedback states: Success, Warning, Error, and Info.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => toast.success("Quotation Saved", "Draft revision 2 created successfully.")}
                            >
                                Trigger Success
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toast.warning("Approval Required", "Discount rate of 22% exceeds Rep limit (15%).")}
                            >
                                Trigger Warning
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => toast.error("Allocation Failed", "Insufficient inventory in North Logistics Hub.")}
                            >
                                Trigger Error
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info("Customer Negotiation", "Reliance Retail submitted 2 line item change requests.")}
                            >
                                Trigger Info
                            </Button>
                        </div>

                        {/* Inline Error State Box */}
                        <div className="pt-2">
                            <ErrorState
                                compact
                                message="Discount governance policy for Gold Tier was updated by Finance Admin."
                                onRetry={() => toast.info("Refreshing policy rules...")}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Empty State Component Verification */}
            <EmptyState
                icon={<FileText className="w-6 h-6 text-[#94A3B8]" />}
                title="No Pending Approvals in Queue"
                description="All submitted discount requests have been evaluated. New requests from sales reps will appear here automatically."
                action={
                    <Button variant="outline" size="sm" onClick={() => toast.info("Approvals refreshed.")}>
                        Refresh Queue
                    </Button>
                }
            />

            {/* Test Modal Dialog */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Discount Governance Evaluation"
                description="Quotation #QT-2026-0891 exceeds standard threshold."
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                                setIsModalOpen(false);
                                toast.success("Approval Request Dispatched", "Forwarded to Sales Manager for review.");
                            }}
                        >
                            Request Manager Approval
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-[13px] text-[#475569]">
                        The proposed line discount of <strong>22.0%</strong> on SKU <code>SRV-CLOUD-ENTERPRISE</code> triggers a <strong>Sales Manager Approval</strong> requirement under Tier Silver rules.
                    </p>
                    <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-[12px] text-[#B45309]">
                        Estimated margin impact: -₹32,500 across 50 annual licenses.
                    </div>
                </div>
            </Modal>

            {/* Test Drawer Panel */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Deal Context Inspector"
                description="Contextual intelligence preview for Quotation QT-2026-0891"
                footer={
                    <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(false)}>
                        Close Inspector
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                            Customer Relationship
                        </span>
                        <p className="text-[14px] font-medium text-[#0F172A]">
                            Tata Consultancy Solutions
                        </p>
                        <StatusBadge type="tier" status="GOLD" size="sm" />
                    </div>

                    <div className="space-y-1 pt-2 border-t border-[#F1F5F9]">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                            Deal Risk Signals
                        </span>
                        <div className="space-y-2 mt-1">
                            <div className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[12px]">
                                <span className="font-semibold text-[#0F172A]">Margin Leakage</span>: Discount of 12.0% is within standard 15.0% Gold tier boundary.
                            </div>
                            <div className="p-2.5 rounded border border-[#A7F3D0] bg-[#ECFDF5] text-[12px] text-[#047857]">
                                <span className="font-semibold">Inventory Allocation</span>: 100% available in Central Warehouse.
                            </div>
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}
