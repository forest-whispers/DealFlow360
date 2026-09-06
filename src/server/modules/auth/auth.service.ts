import bcrypt from "bcryptjs";

import { prisma } from "@/server/shared/db/prisma";

import {
    ConflictError,
    UnauthorizedError,
} from "@/server/shared/errors/errors";

import { setSessionCookie, getSessionPayload } from "./auth.session";
import { discountGovernanceService } from "@/server/modules/discount-governance/discount-governance.service";

import type {
    AuthenticatedUser,
    LoginInput,
    SignupInput,
} from "./auth.types";

export class AuthService {
    async signup(
        input: SignupInput,
    ): Promise<AuthenticatedUser> {
        const existingOrganization =
            await prisma.organization.findUnique({
                where: {
                    slug: input.organizationSlug,
                },
                select: {
                    id: true,
                },
            });

        let user: AuthenticatedUser;

        const passwordHash = await bcrypt.hash(
            input.password,
            12,
        );

        if (existingOrganization) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: input.email,
                    organizationId: existingOrganization.id,
                },
                select: {
                    id: true,
                },
            });

            if (existingUser) {
                throw new ConflictError(
                    "A user with this email already exists in this organization.",
                );
            }

            user = await prisma.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    passwordHash,

                    organizationId:
                        existingOrganization.id,

                    role: "SALES_REP",
                },

                select: {
                    id: true,
                    organizationId: true,
                    name: true,
                    email: true,
                    role: true,
                },
            });
        } else {
            const organization =
                await prisma.organization.create({
                    data: {
                        name: input.organizationName,
                        slug: input.organizationSlug,

                        users: {
                            create: {
                                name: input.name,
                                email: input.email,
                                passwordHash,

                                // The first user creating
                                // the organization is always ADMIN.
                                role: "ADMIN",
                            },
                        },
                    },

                    select: {
                        id: true,

                        users: {
                            select: {
                                id: true,
                                organizationId: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                });

            const createdUser =
                organization.users[0];

            if (!createdUser) {
                throw new ConflictError(
                    "Unable to create the organization owner.",
                );
            }

            await discountGovernanceService.ensureDefaultGovernance(
                organization.id,
            );

            user = createdUser;
        }

        await setSessionCookie({
            userId: user.id,
            organizationId:
                user.organizationId,
            role: user.role,
        });

        return user;
    }

    async login(
        input: LoginInput,
    ): Promise<AuthenticatedUser> {
        const existingSession = await getSessionPayload();

        if (existingSession) {
            throw new ConflictError(
                "An active session already exists. Please log out before signing in.",
            );
        }
        const user =
            await prisma.user.findFirst({
                where: {
                    email: input.email,

                    organization: {
                        slug: input.organizationSlug,
                    },
                },

                select: {
                    id: true,
                    organizationId: true,
                    name: true,
                    email: true,
                    passwordHash: true,
                    role: true,
                    isActive: true,
                },
            });

        if (!user || !user.isActive) {
            throw new UnauthorizedError(
                "Invalid email or password.",
            );
        }

        const passwordMatches =
            await bcrypt.compare(
                input.password,
                user.passwordHash,
            );

        if (!passwordMatches) {
            throw new UnauthorizedError(
                "Invalid email or password.",
            );
        }

        await setSessionCookie({
            userId: user.id,
            organizationId:
                user.organizationId,
            role: user.role,
        });

        return {
            id: user.id,
            organizationId:
                user.organizationId,
            name: user.name,
            email: user.email,
            role: user.role,
        };
    }
}

export const authService = new AuthService();