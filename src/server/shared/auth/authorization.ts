import { UserRole } from "@prisma/client";

import { prisma } from "../db/prisma";

import {
    ForbiddenError,
    UnauthorizedError,
} from "@/server/shared/errors/errors";

import { getSessionPayload } from "@/server/modules/auth/auth.session";

import type { AuthenticatedUser } from "@/server/modules/auth/auth.types";

export async function requireAuth(): Promise<AuthenticatedUser> {
    const session = await getSessionPayload();

    if (!session) {
        throw new UnauthorizedError(
            "Authentication required.",
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            id: session.userId,
            organizationId: session.organizationId,
            isActive: true,
        },
        select: {
            id: true,
            organizationId: true,
            name: true,
            email: true,
            role: true,
        },
    });

    if (!user) {
        throw new UnauthorizedError(
            "Invalid or expired session.",
        );
    }

    return user;
}

export async function requireRole(
    ...allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(
            "You do not have permission to perform this action.",
        );
    }

    return user;
}

export async function requireOrganizationAccess(
    organizationId: string,
): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (user.organizationId !== organizationId) {
        throw new ForbiddenError(
            "You do not have access to this organization.",
        );
    }

    return user;
}