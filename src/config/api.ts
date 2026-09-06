/**
 * Frontend API Configuration
 *
 * Base API URL pointing to the DealFlow360 backend API.
 * In Next.js client code, NEXT_PUBLIC_API_URL is exposed to the browser.
 */

export const API_BASE_URL: string =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const API_ROUTES = {
    BASE: API_BASE_URL,

    AUTH: {
        SIGNUP: `${API_BASE_URL}/auth/signup`,
        LOGIN: `${API_BASE_URL}/auth/login`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        ME: `${API_BASE_URL}/auth/me`,
    },

    USERS: {
        LIST: `${API_BASE_URL}/users`,
        BY_ID: (id: string) => `${API_BASE_URL}/users/${id}`,
        UPDATE_ROLE: (id: string) => `${API_BASE_URL}/users/${id}/role`,
        UPDATE_STATUS: (id: string) => `${API_BASE_URL}/users/${id}/status`,
    },

    CUSTOMERS: {
        LIST: `${API_BASE_URL}/customers`,
        CREATE: `${API_BASE_URL}/customers`,
        BY_ID: (id: string) => `${API_BASE_URL}/customers/${id}`,
        STATUS: (id: string) => `${API_BASE_URL}/customers/${id}/status`,
    },

    PRODUCTS: {
        LIST: `${API_BASE_URL}/products`,
        CREATE: `${API_BASE_URL}/products`,
        BY_ID: (id: string) => `${API_BASE_URL}/products/${id}`,
        STATUS: (id: string) => `${API_BASE_URL}/products/${id}/status`,

        VARIANTS: {
            LIST: (productId: string) => `${API_BASE_URL}/products/${productId}/variants`,
            CREATE: (productId: string) => `${API_BASE_URL}/products/${productId}/variants`,
            BY_ID: (productId: string, variantId: string) =>
                `${API_BASE_URL}/products/${productId}/variants/${variantId}`,
            STATUS: (productId: string, variantId: string) =>
                `${API_BASE_URL}/products/${productId}/variants/${variantId}/status`,
        },
    },

    DISCOUNT_GOVERNANCE: {
        EVALUATE_LINE: `${API_BASE_URL}/discount-governance/evaluate-line`,
        APPROVAL_POLICY: `${API_BASE_URL}/discount-governance/approval-policy`,

        TIER_RULES: {
            LIST: `${API_BASE_URL}/discount-governance/tier-rules`,
            CREATE: `${API_BASE_URL}/discount-governance/tier-rules`,
            BY_ID: (id: string) =>
                `${API_BASE_URL}/discount-governance/tier-rules/${id}`,
        },

        CATEGORY_RULES: {
            LIST: `${API_BASE_URL}/discount-governance/category-rules`,
            CREATE: `${API_BASE_URL}/discount-governance/category-rules`,
            BY_ID: (id: string) =>
                `${API_BASE_URL}/discount-governance/category-rules/${id}`,
        },
    },

    QUOTATIONS: {
        LIST: `${API_BASE_URL}/quotations`,
        CREATE: `${API_BASE_URL}/quotations`,
        BY_ID: (id: string) => `${API_BASE_URL}/quotations/${id}`,
        PREVIEW: (id: string) => `${API_BASE_URL}/quotations/${id}/preview`,
        SAVE_DRAFT: (id: string) => `${API_BASE_URL}/quotations/${id}/draft`,
        SUBMIT: (id: string) => `${API_BASE_URL}/quotations/${id}/submit`,
        LINE_PREVIEW: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/lines/preview`,
        LINE_RECALCULATE: (id: string, lineNumber: number | string) =>
            `${API_BASE_URL}/quotations/${id}/lines/${lineNumber}`,
        APPROVALS: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/approvals`,
        SEND: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/send`,
        DEAL_HEALTH: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/deal-health`,
        DEAL_CONTEXT: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/deal-context`,
        NEGOTIATION: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/negotiation`,
        CHANGE_REQUEST_REJECT: (id: string, requestId: string) =>
            `${API_BASE_URL}/quotations/${id}/change-requests/${requestId}/reject`,
        AI_NEGOTIATION_PREVIEW: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/ai/negotiation/preview`,
        AI_NEGOTIATION_EXECUTE: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/ai/negotiation/execute`,
    },

    AI_NEGOTIATION: {
        PREVIEW: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/ai/negotiation/preview`,
        EXECUTE: (id: string) =>
            `${API_BASE_URL}/quotations/${id}/ai/negotiation/execute`,
    },

    APPROVALS: {
        APPROVE: (id: string) => `${API_BASE_URL}/approvals/${id}/approve`,
        REJECT: (id: string) => `${API_BASE_URL}/approvals/${id}/reject`,
    },

    PORTAL: {
        QUOTATIONS: {
            LIST: `${API_BASE_URL}/portal/quotations`,
            BY_ID: (id: string) => `${API_BASE_URL}/portal/quotations/${id}`,
            MESSAGES: (id: string) =>
                `${API_BASE_URL}/portal/quotations/${id}/messages`,
            CHANGE_REQUESTS: (id: string) =>
                `${API_BASE_URL}/portal/quotations/${id}/change-requests`,
            CONFIRM: (id: string) =>
                `${API_BASE_URL}/portal/quotations/${id}/confirm`,
            NEGOTIATION: (id: string) =>
                `${API_BASE_URL}/portal/quotations/${id}/negotiation`,
        },
    },

    WAREHOUSES: {
        LIST: `${API_BASE_URL}/warehouses`,
        CREATE: `${API_BASE_URL}/warehouses`,
        BY_ID: (id: string) => `${API_BASE_URL}/warehouses/${id}`,
        STATUS: (id: string) => `${API_BASE_URL}/warehouses/${id}/status`,
        INVENTORY: {
            LIST: (id: string) => `${API_BASE_URL}/warehouses/${id}/inventory`,
            CREATE: (id: string) => `${API_BASE_URL}/warehouses/${id}/inventory`,
            UPDATE_QTY: (id: string, inventoryId: string) =>
                `${API_BASE_URL}/warehouses/${id}/inventory/${inventoryId}`,
        },
    },

    FULFILLMENTS: {
        LIST: `${API_BASE_URL}/fulfillments`,
        CREATE: `${API_BASE_URL}/fulfillments`,
        BY_ID: (id: string) => `${API_BASE_URL}/fulfillments/${id}`,
    },

    BILLING: {
        GENERATE: `${API_BASE_URL}/billing`,
    },

    INVOICES: {
        LIST: `${API_BASE_URL}/invoices`,
        BY_ID: (id: string) => `${API_BASE_URL}/invoices/${id}`,
        PAY: (id: string) => `${API_BASE_URL}/invoices/${id}/pay`,
    },

    SUBSCRIPTIONS: {
        LIST: `${API_BASE_URL}/subscriptions`,
        BY_ID: (id: string) => `${API_BASE_URL}/subscriptions/${id}`,
    },
} as const;