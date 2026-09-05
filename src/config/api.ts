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
} as const;