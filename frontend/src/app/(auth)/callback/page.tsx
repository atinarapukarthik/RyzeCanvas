"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function AuthCallbackPage() {
	return (
		<Suspense fallback={null}>
			<AuthCallbackContent />
		</Suspense>
	);
}

function AuthCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const setUser = useAuthStore((s) => s.setUser);

	useEffect(() => {
		const success = searchParams.get("success");
		const errorParam = searchParams.get("error");

		if (errorParam) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setError(decodeURIComponent(errorParam).replace(/_/g, " "));
			return;
		}

		if (success === "true") {
			const token = searchParams.get("token") || "";
			const userParam = searchParams.get("user");

			const populateAndRedirect = (userData: Record<string, unknown>) => {
				// Set cookie for middleware route protection (matches regular login behavior)
				if (token) {
					document.cookie = `access_token=${token}; path=/; max-age=${30 * 60}; samesite=lax`;
				}
				setUser(
					{
						id: String(userData.id),
						email: userData.email as string,
						name: (userData.full_name || userData.name) as string,
						full_name: userData.full_name as string,
						role: userData.role as "admin" | "user",
						is_active: userData.is_active as boolean,
						created_at: userData.created_at as string,
						github_username: userData.github_username as string,
						github_token: userData.github_token as string,
					},
					token
				);
				router.replace("/dashboard");
			};

			// Try reading user data from the query parameter (base64-encoded JSON)
			if (userParam) {
				try {
					const userData = JSON.parse(atob(userParam));
					populateAndRedirect(userData);
					return;
				} catch {
					// Fall through to fetch
				}
			}

			// Fallback: fetch user data using the token
			if (token) {
				fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me`,
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				)
					.then((res) => {
						if (!res.ok) throw new Error("Failed to fetch profile");
						return res.json();
					})
					.then(populateAndRedirect)
					.catch(() => {
						router.replace("/login");
					});
			} else {
				router.replace("/login");
			}
		} else {
			router.replace("/login");
		}
	}, [searchParams, router, setUser]);

	if (error) {
		return (
			<div className="w-full text-center">
				<h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
				<p className="text-muted-foreground text-sm mb-4">{error}</p>
				<button
					onClick={() => router.push("/login")}
					className="text-sm text-primary hover:underline font-medium"
				>
					Back to Sign In
				</button>
			</div>
		);
	}

	return (
		<div className="w-full flex flex-col items-center justify-center gap-3">
			<Loader2 className="w-8 h-8 animate-spin text-primary" />
			<p className="text-sm text-muted-foreground">Completing sign in...</p>
		</div>
	);
}
