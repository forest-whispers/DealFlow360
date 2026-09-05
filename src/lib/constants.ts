/**
 * UI Presentation Constants & Metadata for DealFlow360
 *
 * NOTE: The backend remains the sole authoritative source of business rules, permissions,
 * state transitions, and calculations. These definitions are strictly for UI rendering,
 * display labels, semantic colors, and shell navigation.
 */

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

// ==========================================
// Quotation Status UI Metadata
// ==========================================
export const QUOTATION_STATUS_META: Record<
    string,
    { label: string; variant: StatusVariant; description: string }
> = {
    DRAFT: {
        label: "Draft",
        variant: "neutral",
        description: "Quotation is being prepared by sales rep",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        variant: "warning",
        description: "Discount requires managerial/finance approval",
    },
    APPROVED: {
        label: "Approved",
        variant: "success",
        description: "Approved internally, ready to send to customer",
    },
    REJECTED: {
        label: "Rejected",
        variant: "danger",
        description: "Approval request was rejected",
    },
    SENT: {
        label: "Sent",
        variant: "info",
        description: "Delivered to customer for review",
    },
    UNDER_NEGOTIATION: {
        label: "Under Negotiation",
        variant: "info",
        description: "Customer has proposed changes or countered",
    },
    CONFIRMED: {
        label: "Confirmed",
        variant: "success",
        description: "Customer confirmed quote; flowing to fulfillment",
    },
};

// ==========================================
// Deal Health Status UI Metadata
// ==========================================
export const DEAL_HEALTH_META: Record<
    string,
    { label: string; variant: StatusVariant; description: string }
> = {
    HEALTHY: {
        label: "Healthy",
        variant: "success",
        description: "High margin, clean terms, low risk profile",
    },
    WATCH: {
        label: "Watch",
        variant: "warning",
        description: "Margin or discount near threshold",
    },
    AT_RISK: {
        label: "At Risk",
        variant: "danger",
        description: "Significant margin leakage or operational friction",
    },
    CRITICAL: {
        label: "Critical",
        variant: "danger",
        description: "Severe margin erosion or deal deadlock",
    },
};

// ==========================================
// Fulfillment Status UI Metadata
// ==========================================
export const FULFILLMENT_STATUS_META: Record<
    string,
    { label: string; variant: StatusVariant }
> = {
    PENDING: { label: "Pending", variant: "warning" },
    PARTIALLY_ALLOCATED: { label: "Partially Allocated", variant: "info" },
    ALLOCATED: { label: "Allocated", variant: "info" },
    IN_PROGRESS: { label: "In Progress", variant: "info" },
    FULFILLED: { label: "Fulfilled", variant: "success" },
};

// ==========================================
// Billing & Invoice Status UI Metadata
// ==========================================
export const BILLING_STATUS_META: Record<
    string,
    { label: string; variant: StatusVariant }
> = {
    PENDING: { label: "Pending", variant: "warning" },
    PAID: { label: "Paid", variant: "success" },
};

// ==========================================
// Approval Status UI Metadata
// ==========================================
export const APPROVAL_STATUS_META: Record<
    string,
    { label: string; variant: StatusVariant }
> = {
    PENDING: { label: "Pending Approval", variant: "warning" },
    APPROVED: { label: "Approved", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
};

// ==========================================
// Change Request Status UI Metadata
// ==========================================
export const CHANGE_REQUEST_STATUS_META: Record<
    string,
    { label: string; variant: StatusVariant }
> = {
    PENDING: { label: "Pending Review", variant: "warning" },
    ACCEPTED: { label: "Accepted", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
    WITHDRAWN: { label: "Withdrawn", variant: "neutral" },
};

// ==========================================
// Customer Tier UI Metadata
// ==========================================
export const CUSTOMER_TIER_META: Record<
    string,
    { label: string; variant: StatusVariant }
> = {
    BRONZE: { label: "Bronze Tier", variant: "neutral" },
    SILVER: { label: "Silver Tier", variant: "info" },
    GOLD: { label: "Gold Tier", variant: "warning" },
};

// ==========================================
// Role Display Metadata
// ==========================================
export const USER_ROLE_META: Record<
    string,
    { label: string; badge: string }
> = {
    ADMIN: { label: "Administrator", badge: "Admin" },
    SALES_REP: { label: "Sales Representative", badge: "Sales Rep" },
    SALES_MANAGER: { label: "Sales Manager", badge: "Manager" },
    FINANCE_OPERATIONS: { label: "Finance & Operations", badge: "Finance" },
    CUSTOMER: { label: "Customer Contact", badge: "Customer" },
};

// ==========================================
// Internal Shell Navigation Items
// ==========================================
export interface NavItem {
    label: string;
    href: string;
    icon: string;
    badgeCount?: number;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export const INTERNAL_NAV_SECTIONS: NavSection[] = [
    {
        title: "Core",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
            { label: "Quotations", href: "/quotations", icon: "FileText" },
            { label: "Customers", href: "/customers", icon: "Users" },
            { label: "Products", href: "/products", icon: "Package" },
        ],
    },
    {
        title: "Operations",
        items: [
            { label: "Approvals", href: "/approvals", icon: "ShieldAlert", badgeCount: 0 },
            { label: "Fulfillment", href: "/fulfillment", icon: "Truck" },
            { label: "Billing", href: "/billing", icon: "Receipt" },
        ],
    },
    {
        title: "Configuration",
        items: [
            { label: "Discount Governance", href: "/governance", icon: "Sliders" },
            { label: "Warehouses", href: "/warehouses", icon: "Warehouse" },
        ],
    },
    {
        title: "System",
        items: [
            { label: "Settings", href: "/settings", icon: "Settings" },
        ],
    },
];

// ==========================================
// Customer Portal Navigation Items
// NOTE: Strictly backed by existing /api/portal routes
// ==========================================
export const PORTAL_NAV_ITEMS: NavItem[] = [
    { label: "My Quotations", href: "/portal/quotations", icon: "FileText" },
];
