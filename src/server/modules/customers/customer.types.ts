import { CustomerTier } from "@prisma/client";

export interface CustomerResponse {
    id: string;
    name: string;
    email: string;
    customerTier: CustomerTier | null;
    customerProfile: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface CustomerListResponse {
    customers: CustomerResponse[];
    pagination: PaginationMetadata;
}

export interface CustomerDetailResponse {
    customer: CustomerResponse;
}

export interface CustomerStatusResponse {
    customer: {
        id: string;
        isActive: boolean;
    };
}

export interface CustomerArchiveResponse {
    message: string;
}

export interface ListCustomersQuery {
    page: number;
    limit: number;
    search?: string;
    tier?: CustomerTier;
    isActive?: boolean;
}

export interface CreateCustomerInput {
    name: string;
    email: string;
    password: string;
    customerTier?: CustomerTier;
    customerProfile?: Record<string, unknown> | null;
}

export interface UpdateCustomerInput {
    name?: string;
    email?: string;
    customerTier?: CustomerTier;
    customerProfile?: Record<string, unknown> | null;
    isActive?: boolean;
}

export interface UpdateCustomerStatusInput {
    isActive: boolean;
}
