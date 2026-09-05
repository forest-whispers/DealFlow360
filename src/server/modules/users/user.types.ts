import { UserRole } from "@prisma/client";
import type { InternalUserRole } from "./user.constants";

export interface SafeUserResponse {
    id: string;
    name: string;
    email: string;
    role: UserRole;
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

export interface UserListResponse {
    users: SafeUserResponse[];
    pagination: PaginationMetadata;
}

export interface UserDetailResponse {
    user: SafeUserResponse;
}

export interface UserRoleChangeResponse {
    user: SafeUserResponse;
}

export interface UserStatusResponse {
    user: {
        id: string;
        isActive: boolean;
    };
}

export interface ListUsersQuery {
    page: number;
    limit: number;
    search?: string;
    role?: InternalUserRole;
    isActive?: boolean;
}

export interface ChangeUserRoleInput {
    role: InternalUserRole;
}

export interface UpdateUserStatusInput {
    isActive: boolean;
}
