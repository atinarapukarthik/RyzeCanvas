"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

interface AppLayoutProps {
  children: React.ReactNode;
  hideTopNav?: boolean;
}

export function AppLayout({ children, hideTopNav = false }: AppLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const { isAuthenticated, logout } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Verify session with backend on mount — skip if already logging out
    let cancelled = false;
    const verifySession = async () => {
      if (isAuthenticated && !isVerifying) {
        setIsVerifying(true);
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
          const token = localStorage.getItem("token");
          const headers: HeadersInit = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers,
            credentials: "include"
          });

          if (!res.ok && !cancelled) {
            console.warn("[AppLayout] Session invalid, logging out");
            logout();
          }
        } catch (e) {
          console.error("[AppLayout] Session verification error:", e);
        } finally {
          if (!cancelled) setIsVerifying(false);
        }
      }
    };

    verifySession();
    return () => { cancelled = true; };
  }, [isAuthenticated, logout, isVerifying]);

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col w-full relative">
        {!hideTopNav && <TopNavBar />}
        <main className={isDashboard ? "flex-1 overflow-hidden" : "flex-1 overflow-auto"}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
