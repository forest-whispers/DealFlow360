import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
    id: string;
    organizationId: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface SessionPayload {
    userId: string;
    organizationId: string;
    role: UserRole;
}

export interface SignupInput {
    organizationName: string;
    organizationSlug: string;
    name: string;
    email: string;
    password: string;
}

export interface LoginInput {
    organizationSlug: string;
    email: string;
    password: string;
}