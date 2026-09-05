import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/server/modules/auth/auth.constants";
import { verifySessionToken } from "@/server/modules/auth/auth.session";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    // Cryptographically verify session signature and expiration using backend secret
    const session = token ? verifySessionToken(token) : null;
    const isAuthenticated = Boolean(session);
    const isCustomer = session?.role === "CUSTOMER";

    // 1. Root route: '/'
    if (pathname === "/") {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        if (isCustomer) {
            return NextResponse.redirect(new URL("/portal/quotations", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // 2. Public auth routes: '/login', '/signup'
    if (pathname === "/login" || pathname === "/signup") {
        if (isAuthenticated) {
            if (isCustomer) {
                return NextResponse.redirect(new URL("/portal/quotations", request.url));
            }
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // 3. Customer portal routes: '/portal' or '/portal/...'
    if (pathname.startsWith("/portal")) {
        if (!isAuthenticated) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
        if (!isCustomer) {
            // Internal users attempting to access customer portal
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // 4. Internal protected routes: '/dashboard', '/quotations', etc.
    if (!isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isCustomer) {
        // Customer attempting to access internal operations
        return NextResponse.redirect(new URL("/portal/quotations", request.url));
    }

    return NextResponse.next();
}

/**
 * Narrowly matched to application page routes only.
 * Specifically excludes /api/*, _next/static, _next/image, and static assets.
 */
export const config = {
    matcher: [
        "/",
        "/login",
        "/signup",
        "/dashboard/:path*",
        "/quotations/:path*",
        "/customers/:path*",
        "/products/:path*",
        "/approvals/:path*",
        "/fulfillment/:path*",
        "/billing/:path*",
        "/governance/:path*",
        "/warehouses/:path*",
        "/settings/:path*",
        "/portal/:path*",
    ],
};
