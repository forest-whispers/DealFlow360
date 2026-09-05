import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { env } from "@/server/shared/config/env";

import {
    AUTH_COOKIE_NAME,
    SESSION_DURATION_SECONDS,
} from "./auth.constants";

import type { SessionPayload } from "./auth.types";

export function createSessionToken(
    payload: SessionPayload,
): string {
    return jwt.sign(
        {
            organizationId: payload.organizationId,
            role: payload.role,
        },
        env.AUTH_SECRET,
        {
            subject: payload.userId,
            expiresIn: SESSION_DURATION_SECONDS,
        },
    );
}

export async function setSessionCookie(
    payload: SessionPayload,
): Promise<void> {
    const token = createSessionToken(payload);

    const cookieStore = await cookies();

    cookieStore.set(
        AUTH_COOKIE_NAME,
        token,
        {
            httpOnly: true,
            secure:
                process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        },
    );
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(
        AUTH_COOKIE_NAME,
        "",
        {
            httpOnly: true,
            secure:
                process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        },
    );
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();

    const token =
        cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(
            token,
            env.AUTH_SECRET,
        );

        if (
            typeof decoded !== "object" ||
            decoded === null ||
            typeof decoded.sub !== "string" ||
            typeof decoded.organizationId !== "string" ||
            typeof decoded.role !== "string"
        ) {
            return null;
        }

        return {
            userId: decoded.sub,
            organizationId:
                decoded.organizationId,
            role: decoded.role as SessionPayload["role"],
        };
    } catch {
        return null;
    }
}