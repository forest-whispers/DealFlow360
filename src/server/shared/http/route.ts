import { NextRequest, NextResponse } from "next/server";

import { AppError } from "../errors/appError";
import { ZodError } from "zod";

type RouteContext = {
    params?: any;
};

type RouteHandler = (
    request: NextRequest,
    context: RouteContext
) => Promise<NextResponse>;

export function createRouteHandler(handler: RouteHandler) {
    return async (
        request: NextRequest,
        context: RouteContext
    ): Promise<NextResponse> => {
        try {
            return await handler(request, context);
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.issues[0]?.message || "Validation failed";
                return NextResponse.json(
                    { message },
                    { status: 422 }
                );
            }
            if (error instanceof AppError) {
                return NextResponse.json(
                    {
                        message: error.message,
                    },
                    {
                        status: error.statusCode,
                    }
                );
            }

            console.error(error);

            return NextResponse.json(
                {
                    message: "Internal Server Error",
                },
                {
                    status: 500,
                }
            );
        }
    };
}