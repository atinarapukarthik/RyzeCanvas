import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1";
const FRONTEND_URL =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            return NextResponse.redirect(
                `${FRONTEND_URL}/callback?error=${encodeURIComponent(error)}`
            );
        }

        if (!code) {
            return NextResponse.redirect(
                `${FRONTEND_URL}/callback?error=missing_code`
            );
        }

        // Forward code and state to backend callback
        const params = new URLSearchParams();
        params.set("code", code);
        if (state) params.set("state", state);

        const response = await fetch(
            `${API_URL}/auth/google/callback?${params.toString()}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                redirect: "manual",
            }
        );

        // Backend returns a 302 redirect with token & user data in the Location URL
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (location) {
                return NextResponse.redirect(location);
            }
        }

        // If backend returned 200, check for redirect URL in response
        if (response.ok) {
            return NextResponse.redirect(
                `${FRONTEND_URL}/callback?success=true`
            );
        }

        return NextResponse.redirect(
            `${FRONTEND_URL}/callback?error=oauth_failed`
        );
    } catch {
        return NextResponse.redirect(
            `${FRONTEND_URL}/callback?error=internal_error`
        );
    }
}
