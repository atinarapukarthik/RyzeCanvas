import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/studio", "/history", "/settings", "/admin"];

// Routes that should redirect to /studio if already authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth cookie (HTTP-only cookies are accessible in middleware)
  const accessToken = request.cookies.get("access_token")?.value;
  // Also check for localStorage-synced token in a custom cookie
  const hasAuth = !!accessToken;

  // Protect dashboard routes — redirect to login if no token
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !hasAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and visiting auth pages, redirect to studio
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && hasAuth) {
    return NextResponse.redirect(new URL("/studio", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all protected and auth routes
    "/studio/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
