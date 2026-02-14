"use client";

import { usePathname } from "next/navigation";
import { TopNavBar } from "@/components/TopNavBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface AppLayoutProps {
  children: React.ReactNode;
  hideTopNav?: boolean;
}

export function AppLayout({ children, hideTopNav = false }: AppLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

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
