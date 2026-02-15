import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1";

export async function GET() {
    try {
        const response = await fetch(`${API_URL}/auth/google/url`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(error, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ auth_url: data.auth_url });
    } catch (error: unknown) {
        const err = error as { message?: string };
        return NextResponse.json(
            { detail: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
