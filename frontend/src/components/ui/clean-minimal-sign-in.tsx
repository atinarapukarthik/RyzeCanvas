"use client";

import * as React from "react";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SignInProps {
	onSubmit?: (email: string, password: string) => void | Promise<void>;
	onForgotPassword?: () => void;
	onSignUpClick?: () => void;
	className?: string;
}

export function SignIn({
	onSubmit,
	onForgotPassword,
	onSignUpClick,
	className,
}: SignInProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);

	const validateEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSignIn = async () => {
		if (!email || !password) {
			setError("Please enter both email and password.");
			return;
		}
		if (!validateEmail(email)) {
			setError("Please enter a valid email address.");
			return;
		}
		setError("");
		setIsLoading(true);
		try {
			if (onSubmit) {
				await onSubmit(email, password);
			} else {
				alert("Sign in successful! (Demo)");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign in failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setError("");
		setIsGoogleLoading(true);
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}/callback`,
				},
			});
			if (error) {
				setError(error.message);
				setIsGoogleLoading(false);
			}
		} catch {
			setError("Google sign in failed. Please try again.");
			setIsGoogleLoading(false);
		}
	};


	return (
		<div className={cn("w-full", className)}>
			<div className="text-center mb-8">
				<h2 className="text-2xl font-semibold">Welcome back</h2>
				<p className="text-muted-foreground text-sm mt-2">
					Sign in to continue building
				</p>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSignIn();
				}}
				className="w-full flex flex-col gap-3 mb-2"
			>
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
						<Mail className="w-4 h-4" />
					</span>
					<input
						placeholder="Email"
						type="email"
						value={email}
						disabled={isLoading}
						autoComplete="email"
						className="w-full pl-10 pr-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/50 text-foreground text-sm"
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
						<Lock className="w-4 h-4" />
					</span>
					<input
						placeholder="Password"
						type="password"
						value={password}
						disabled={isLoading}
						autoComplete="current-password"
						className="w-full pl-10 pr-10 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/50 text-foreground text-sm"
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<div className="w-full flex justify-between items-center">
					{error && (
						<div className="text-sm text-destructive text-left">{error}</div>
					)}
					<button
						type="button"
						onClick={onForgotPassword}
						className="text-xs hover:underline font-medium text-primary ml-auto"
					>
						Forgot password?
					</button>
				</div>
				<button
					type="submit"
					disabled={isLoading}
					className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? "Signing in..." : "Get Started"}
				</button>
			</form>
			<div className="flex items-center w-full my-2">
				<div className="flex-grow border-t border-dashed border-border"></div>
				<span className="mx-2 text-xs text-muted-foreground">
					Or sign in with
				</span>
				<div className="flex-grow border-t border-dashed border-border"></div>
			</div>
			<div className="flex gap-3 w-full justify-center mt-2">
				<button
					onClick={handleGoogleSignIn}
					disabled={isGoogleLoading || isLoading}
					className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-background hover:bg-muted transition grow disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<svg className="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
					</svg>
					{isGoogleLoading ? (
						<span className="text-sm text-muted-foreground">Redirecting...</span>
					) : (
						<span className="text-sm text-foreground">Google</span>
					)}
				</button>
			</div>
			{onSignUpClick && (
				<div className="mt-6 text-center">
					<span className="text-sm text-muted-foreground">
						Don&apos;t have an account?{" "}
					</span>
					<button
						onClick={onSignUpClick}
						className="text-sm text-primary hover:underline font-medium"
					>
						Sign up
					</button>
				</div>
			)}
		</div>
	);
}
