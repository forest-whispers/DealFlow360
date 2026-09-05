import React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
    QUOTATION_STATUS_META,
    DEAL_HEALTH_META,
    FULFILLMENT_STATUS_META,
    BILLING_STATUS_META,
    APPROVAL_STATUS_META,
    CUSTOMER_TIER_META,
    type StatusVariant,
} from "@/lib/constants";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
    type: "quotation" | "deal-health" | "fulfillment" | "billing" | "approval" | "tier";
    status: string;
    showLabel?: boolean;
}

export function StatusBadge({
    type,
    status,
    showLabel = true,
    size = "default",
    dot = true,
    className,
    ...props
}: StatusBadgeProps) {
    let meta: { label: string; variant: StatusVariant } | undefined;

    switch (type) {
        case "quotation":
            meta = QUOTATION_STATUS_META[status];
            break;
        case "deal-health":
            meta = DEAL_HEALTH_META[status];
            break;
        case "fulfillment":
            meta = FULFILLMENT_STATUS_META[status];
            break;
        case "billing":
            meta = BILLING_STATUS_META[status];
            break;
        case "approval":
            meta = APPROVAL_STATUS_META[status];
            break;
        case "tier":
            meta = CUSTOMER_TIER_META[status];
            break;
    }

    const variant: StatusVariant = meta?.variant ?? "neutral";
    const label = meta?.label ?? status.replace(/_/g, " ");

    return (
        <Badge
            variant={variant}
            size={size}
            dot={dot}
            className={className}
            {...props}
        >
            {showLabel && label}
        </Badge>
    );
}
