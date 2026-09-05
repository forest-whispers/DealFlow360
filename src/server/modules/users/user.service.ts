import { Prisma } from "@prisma/client";
import { prisma } from "@/server/shared/db/prisma";
import {
    BadRequestError,
    NotFoundError,
} from "@/server/shared/errors/errors";
import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";
import { INTERNAL_USER_ROLES, type InternalUserRole } from "./user.constants";
import type {
    ListUsersQuery,
    SafeUserResponse,
    UserDetailResponse,
    UserListResponse,
    UserRoleChangeResponse,
    UserStatusResponse,
} from "./user.types";

interface UserRecord {
    id: string;
    name: string;
    email: string;
    role: (typeof INTERNAL_USER_ROLES)[number];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

function mapUserToSafeResponse(record: UserRecord): SafeUserResponse {
    return {
        id: record.id,
        name: record.name,
        email: record.email,
        role: record.role,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class UserService {
    /**
     * 1. List organization users
     * Strictly limits results to internal roles (excludes CUSTOMER) at the query boundary.
     */
    async listUsers(
        adminUser: AuthenticatedUser,
        query: ListUsersQuery
    ): Promise<UserListResponse> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            organizationId: adminUser.organizationId,
            // Enforce internal user roles; customer users are never returned
            role: query.role ? query.role : { in: [...INTERNAL_USER_ROLES] },
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.search
                ? {
                      OR: [
                          { name: { contains: query.search, mode: "insensitive" } },
                          { email: { contains: query.search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [total, users] = await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            users: users.map((u) =>
                mapUserToSafeResponse({
                    ...u,
                    role: u.role as (typeof INTERNAL_USER_ROLES)[number],
                })
            ),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * 2. Get user by ID
     * Enforces organization scope and internal role boundary.
     */
    async getUserById(
        adminUser: AuthenticatedUser,
        targetUserId: string
    ): Promise<UserDetailResponse> {
        const user = await prisma.user.findFirst({
            where: {
                id: targetUserId,
                organizationId: adminUser.organizationId,
                role: { in: [...INTERNAL_USER_ROLES] },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundError("User not found.");
        }

        return {
            user: mapUserToSafeResponse({
                ...user,
                role: user.role as (typeof INTERNAL_USER_ROLES)[number],
            }),
        };
    }

    /**
     * 3. Change user role
     * Enforces organization scope, self-mutation rejection, and atomic role assignment.
     */
    async changeUserRole(
        adminUser: AuthenticatedUser,
        targetUserId: string,
        newRole: InternalUserRole
    ): Promise<UserRoleChangeResponse> {
        if (targetUserId === adminUser.id) {
            throw new BadRequestError("Administrators cannot modify their own role.");
        }

        const targetUser = await prisma.user.findFirst({
            where: {
                id: targetUserId,
                organizationId: adminUser.organizationId,
                role: { in: [...INTERNAL_USER_ROLES] },
            },
        });

        if (!targetUser) {
            throw new NotFoundError("User not found in organization.");
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { role: newRole },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return {
            user: mapUserToSafeResponse({
                ...updated,
                role: updated.role as (typeof INTERNAL_USER_ROLES)[number],
            }),
        };
    }

    /**
     * 4. Update user status (Activate / Deactivate)
     * Enforces organization scope and self-mutation rejection.
     */
    async updateUserStatus(
        adminUser: AuthenticatedUser,
        targetUserId: string,
        isActive: boolean
    ): Promise<UserStatusResponse> {
        if (targetUserId === adminUser.id) {
            throw new BadRequestError(
                "Administrators cannot modify their own account status."
            );
        }

        const targetUser = await prisma.user.findFirst({
            where: {
                id: targetUserId,
                organizationId: adminUser.organizationId,
                role: { in: [...INTERNAL_USER_ROLES] },
            },
        });

        if (!targetUser) {
            throw new NotFoundError("User not found in organization.");
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { isActive },
            select: {
                id: true,
                isActive: true,
            },
        });

        return {
            user: {
                id: updated.id,
                isActive: updated.isActive,
            },
        };
    }
}

export const userService = new UserService();
