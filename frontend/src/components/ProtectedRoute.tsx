"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

/**
 * Wait for Zustand persist to finish hydrating before reading auth state.
 * Without this, `isAuthenticated` is `false` on the very first render
 * (the store's default), which triggers a premature redirect to /login.
 * Once hydration completes the real persisted value is available.
 */
function useHasHydrated() {
  return useSyncExternalStore(
    (cb) => {
      const unsub = useAuthStore.persist.onFinishHydration(cb);
      return () => { unsub(); };
    },
    () => useAuthStore.persist.hasHydrated(),
    () => false // server snapshot — always false during SSR
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useHasHydrated();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Wait for BOTH: component mounted AND Zustand store hydrated.
    // Checking `isAuthenticated` before hydration reads the default (false)
    // which would trigger a redirect even when the user is logged in.
    if (mounted && hasHydrated && !isAuthenticated && !redirectingRef.current) {
      redirectingRef.current = true;
      router.replace("/login");
    }
    // Reset the ref if the user becomes authenticated (e.g. after login redirect back)
    if (mounted && hasHydrated && isAuthenticated) {
      redirectingRef.current = false;
    }
  }, [isAuthenticated, router, mounted, hasHydrated]);

  // Avoid hydration mismatch
  if (!mounted) return null;

  // Store hasn't finished hydrating yet — show a loading state, NOT a redirect
  if (!hasHydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
