import { NextResponse } from "next/server";

export const ok = <T>(data: T) => {
    return NextResponse.json(data);
};

export const created = <T>(data: T) => {
    return NextResponse.json(data, {
        status: 201,
    });
};

export const noContent = () => {
    return new NextResponse(null, {
        status: 204,
    });
};