/**
 * DealFlow360 API Client
 *
 * Lightweight, type-safe wrapper around native fetch for client-side API requests.
 * Handles credentials, headers, and extracts structured error messages
 * from the backend createRouteHandler ({ message: string }).
 */

import { API_ROUTES } from '@/config/api';

export class ApiClientError extends Error {
    statusCode: number;
    data?: unknown;

    constructor(message: string, statusCode: number, data?: unknown) {
        super(message);
        this.name = "ApiClientError";
        this.statusCode = statusCode;
        this.data = data;
    }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { body, params, headers, ...customConfig } = options;

    let url = endpoint;
    if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url += (url.includes("?") ? "&" : "?") + queryString;
        }
    }

    const config: RequestInit = {
        method: customConfig.method || "GET",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        credentials: "include", // Always include session cookie
        ...customConfig,
    };

    if (body !== undefined) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
        return null as unknown as T;
    }

    let responseData: unknown;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            responseData = await response.json();
        } catch {
            responseData = null;
        }
    } else {
        responseData = await response.text();
    }

    if (!response.ok) {
        const errorMessage =
            responseData &&
            typeof responseData === "object" &&
            "message" in (responseData as Record<string, unknown>) &&
            typeof (responseData as Record<string, unknown>).message === "string"
                ? (responseData as Record<string, string>).message
                : `Request failed with status ${response.status}`;

        throw new ApiClientError(errorMessage, response.status, responseData);
    }

    return responseData as T;
}

export const apiClient = {
    get: <T>(url: string, options?: RequestOptions) =>
        request<T>(url, { ...options, method: "GET" }),

    post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
        request<T>(url, { ...options, method: "POST", body }),

    patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
        request<T>(url, { ...options, method: "PATCH", body }),

    put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
        request<T>(url, { ...options, method: "PUT", body }),

    delete: <T>(url: string, options?: RequestOptions) =>
        request<T>(url, { ...options, method: "DELETE" }),

    // Deal Intelligence helpers
    getDealHealth: <T>(quotationId: string) =>
        request<T>(API_ROUTES.QUOTATIONS.DEAL_HEALTH(quotationId), { method: "GET" }),
    getDealContext: <T>(quotationId: string) =>
        request<T>(API_ROUTES.QUOTATIONS.DEAL_CONTEXT(quotationId), { method: "GET" }),
    askDealCopilot: <T>(quotationId: string, message: string) =>
        request<T>(API_ROUTES.QUOTATIONS.COPILOT(quotationId), {
            method: "POST",
            body: { message },
        }),
    getDashboard: <T>() =>
        request<T>(API_ROUTES.DASHBOARD, { method: "GET" }),
};
