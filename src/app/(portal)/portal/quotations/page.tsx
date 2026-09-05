"use client";

import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinancialNumeral } from "@/components/shared/financial-numeral";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CustomerQuotationsPortalPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="My Commercial Quotations"
                description="Review commercial proposals, review pricing and terms, negotiate line items, and confirm deals."
                breadcrumbs={[
                    { label: "Customer Portal", href: "/portal/quotations" },
                    { label: "Quotations" },
                ]}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Active Proposals</CardTitle>
                    <CardDescription>
                        Quotations shared by your sales account team awaiting review or confirmation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quotation #</TableHead>
                                <TableHead>Revision</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Issued</TableHead>
                                <TableHead align="right">Total Amount</TableHead>
                                <TableHead align="right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold text-[#1E40AF]">
                                    QT-2026-0891
                                </TableCell>
                                <TableCell className="font-medium text-[#475569]">
                                    Rev 2
                                </TableCell>
                                <TableCell>
                                    <StatusBadge type="quotation" status="UNDER_NEGOTIATION" size="sm" />
                                </TableCell>
                                <TableCell className="text-[#475569]">
                                    Sep 04, 2026
                                </TableCell>
                                <TableCell isNumeric className="font-bold">
                                    <FinancialNumeral amount={748000} currency="INR" />
                                </TableCell>
                                <TableCell align="right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                                    >
                                        Review Proposal
                                    </Button>
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-semibold text-[#1E40AF]">
                                    QT-2026-0850
                                </TableCell>
                                <TableCell className="font-medium text-[#475569]">
                                    Rev 1
                                </TableCell>
                                <TableCell>
                                    <StatusBadge type="quotation" status="CONFIRMED" size="sm" />
                                </TableCell>
                                <TableCell className="text-[#475569]">
                                    Aug 28, 2026
                                </TableCell>
                                <TableCell isNumeric className="font-bold">
                                    <FinancialNumeral amount={1580000} currency="INR" />
                                </TableCell>
                                <TableCell align="right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                    >
                                        View Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
