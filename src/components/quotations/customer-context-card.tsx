"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Mail } from "lucide-react";
import type { CanonicalQuotationCustomer } from "@/server/modules/quotations/quotation.types";

export interface CustomerContextCardProps {
    customer: CanonicalQuotationCustomer;
    customerEmail?: string;
    customerActive?: boolean;
}

export function CustomerContextCard({
    customer,
    customerEmail,
    customerActive = true,
}: CustomerContextCardProps) {
    return (
        <Card className="bg-[#F8FAFC] border-[#E2E8F0]">
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-bold text-[13px] shrink-0">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold text-[#0F172A] truncate">
                                    {customer.name}
                                </span>
                                <StatusBadge
                                    type="tier"
                                    status={customer.customerTier || "BRONZE"}
                                />
                                <Badge variant={customerActive ? "success" : "neutral"} dot>
                                    {customerActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            {customerEmail && (
                                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mt-0.5">
                                    <Mail className="w-3 h-3 text-[#94A3B8]" />
                                    <span>{customerEmail}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Link
                        href={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1E40AF] hover:text-[#1D4ED8] hover:underline self-start sm:self-center"
                    >
                        <span>View Customer Profile</span>
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
