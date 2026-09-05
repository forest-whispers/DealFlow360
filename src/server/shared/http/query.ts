import { NextRequest } from "next/server";

export function getQuery(request: NextRequest) {
    return Object.fromEntries(request.nextUrl.searchParams);
}