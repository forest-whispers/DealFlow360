import { NextRequest } from "next/server";
import { z } from "zod";
import { BadRequestError } from "../errors/errors";

export async function parseBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
): Promise<T> {
    let body: any;
    try {
        body = await request.json();
    } catch (e) {
        throw new BadRequestError("Invalid or missing JSON request body.");
    }
    return schema.parse(body);
}