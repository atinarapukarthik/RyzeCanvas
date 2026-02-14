"use client";

import * as React from "react";
import { useState } from "react";
import { KeyRound, Mail, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForgotPasswordProps {
	onSubmit?: (email: string) => void | Promise<void>;
	onBackToSignIn?: () => void;
	className?: string;
}

export function ForgotPassword({
	onSubmit,
	onBackToSignIn,
	className,
}: ForgotPasswordProps) {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const validateEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSubmit = async () => {
		if (!email) {
			setError("Please enter your email address.");
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
				await onSubmit(email);
			}
			setSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send reset email");
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSubmit();
		}
	};

	if (success) {
		return (
			<div className={cn("w-full text-center", className)}>
				<div className="mb-6">
					<h2 className="text-2xl font-semibold mb-2">
						Check your email
					</h2>
					<p className="text-muted-foreground text-sm">
						We've sent password reset instructions to <strong>{email}</strong>
					</p>
				</div>
				{onBackToSignIn && (
					<button
						onClick={onBackToSignIn}
						className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition flex items-center justify-center gap-2"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to Sign In
					</button>
				)}
			</div>
		);
	}

	return (
		<div className={cn("w-full", className)}>
			<div className="text-center mb-8">
				<h2 className="text-2xl font-semibold">
					Reset your password
				</h2>
				<p className="text-muted-foreground text-sm mt-2">
					Enter your email and we'll send you instructions to reset your password
				</p>
			</div>
				<div className="w-full flex flex-col gap-3 mb-2">
					<div className="relative">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
							<Mail className="w-4 h-4" />
						</span>
						<input
							placeholder="Email"
							type="email"
							value={email}
							disabled={isLoading}
							className="w-full pl-10 pr-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/50 text-foreground text-sm"
							onChange={(e) => setEmail(e.target.value)}
							onKeyPress={handleKeyPress}
						/>
					</div>
					<div className="w-full">
						{error && (
							<div className="text-sm text-destructive text-left">{error}</div>
						)}
					</div>
				</div>
				<button
					onClick={handleSubmit}
					disabled={isLoading}
					className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? "Sending..." : "Send Reset Link"}
				</button>
				{onBackToSignIn && (
					<button
						onClick={onBackToSignIn}
						className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
					>
						<ArrowLeft className="w-3 h-3" />
						Back to Sign In
					</button>
				)}
		</div>
	);
}
