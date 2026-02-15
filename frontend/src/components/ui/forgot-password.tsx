"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Mail, ArrowLeft, ShieldCheck, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from "@/components/ui/input-otp";

type Step = "email" | "otp" | "new-password";

interface ForgotPasswordProps {
	onSendOtp?: (email: string) => Promise<void>;
	onVerifyOtp?: (email: string, otp: string) => Promise<void>;
	onResetPassword?: (email: string, newPassword: string) => Promise<void>;
	onBackToSignIn?: () => void;
	className?: string;
}

export function ForgotPassword({
	onSendOtp,
	onVerifyOtp,
	onResetPassword,
	onBackToSignIn,
	className,
}: ForgotPasswordProps) {
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);

	const startResendCooldown = () => {
		setResendCooldown(60);
		timerRef.current = setInterval(() => {
			setResendCooldown((prev) => {
				if (prev <= 1) {
					if (timerRef.current) clearInterval(timerRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const validateEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSendOtp = async () => {
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
			if (onSendOtp) {
				await onSendOtp(email);
			}
			setStep("otp");
			startResendCooldown();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send OTP");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendOtp = async () => {
		if (resendCooldown > 0) return;
		setError("");
		setIsLoading(true);
		try {
			if (onSendOtp) {
				await onSendOtp(email);
			}
			startResendCooldown();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to resend OTP");
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyOtp = async () => {
		if (otp.length !== 6) {
			setError("Please enter the complete 6-digit code.");
			return;
		}
		setError("");
		setIsLoading(true);
		try {
			if (onVerifyOtp) {
				await onVerifyOtp(email, otp);
			}
			setStep("new-password");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!newPassword) {
			setError("Please enter a new password.");
			return;
		}
		if (newPassword.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		setError("");
		setIsLoading(true);
		try {
			if (onResetPassword) {
				await onResetPassword(email, newPassword);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to reset password");
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			if (step === "email") handleSendOtp();
			else if (step === "otp") handleVerifyOtp();
			else if (step === "new-password") handleResetPassword();
		}
	};

	// Step indicator
	const StepIndicator = () => (
		<div className="flex items-center justify-center gap-2 mb-6">
			{(["email", "otp", "new-password"] as Step[]).map((s, i) => (
				<React.Fragment key={s}>
					<div
						className={cn(
							"w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
							step === s
								? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
								: (["email", "otp", "new-password"] as Step[]).indexOf(step) > i
									? "bg-primary/20 text-primary"
									: "bg-muted text-muted-foreground"
						)}
					>
						{i + 1}
					</div>
					{i < 2 && (
						<div
							className={cn(
								"h-0.5 w-8 rounded-full transition-all duration-300",
								(["email", "otp", "new-password"] as Step[]).indexOf(step) > i
									? "bg-primary/40"
									: "bg-muted"
							)}
						/>
					)}
				</React.Fragment>
			))}
		</div>
	);

	// Step 1: Email
	if (step === "email") {
		return (
			<div className={cn("w-full", className)}>
				<StepIndicator />
				<div className="text-center mb-8">
					<h2 className="text-2xl font-semibold">Reset your password</h2>
					<p className="text-muted-foreground text-sm mt-2">
						Enter your email and we&apos;ll send you a verification code
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
							onKeyDown={handleKeyPress}
						/>
					</div>
					{error && (
						<div className="text-sm text-destructive text-left">{error}</div>
					)}
				</div>
				<button
					onClick={handleSendOtp}
					disabled={isLoading}
					className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? "Sending..." : "Send Verification Code"}
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

	// Step 2: OTP Scanner
	if (step === "otp") {
		return (
			<div className={cn("w-full", className)}>
				<StepIndicator />
				<div className="text-center mb-6">
					<div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
						<ShieldCheck className="w-7 h-7 text-primary" />
					</div>
					<h2 className="text-2xl font-semibold">Enter verification code</h2>
					<p className="text-muted-foreground text-sm mt-2">
						We&apos;ve sent a 6-digit code to <strong>{email}</strong>
					</p>
				</div>

				{/* OTP Scanner Input */}
				<div className="flex flex-col items-center gap-4 mb-4">
					<div className="relative p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
						<div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
							<div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
						</div>
						<div className="flex items-center gap-1 mb-3 justify-center">
							<KeyRound className="w-4 h-4 text-primary/60" />
							<span className="text-xs text-primary/60 font-medium uppercase tracking-wider">
								OTP Scanner
							</span>
						</div>
						<InputOTP
							maxLength={6}
							value={otp}
							onChange={(value) => {
								setOtp(value);
								setError("");
							}}
							disabled={isLoading}
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
								<InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
								<InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup>
								<InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
								<InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
								<InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold rounded-lg border-border" />
							</InputOTPGroup>
						</InputOTP>
					</div>

					{error && (
						<div className="text-sm text-destructive">{error}</div>
					)}

					<button
						onClick={handleResendOtp}
						disabled={resendCooldown > 0 || isLoading}
						className="text-sm text-primary hover:underline font-medium disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
					>
						{resendCooldown > 0
							? `Resend code in ${resendCooldown}s`
							: "Resend code"}
					</button>
				</div>

				<button
					onClick={handleVerifyOtp}
					disabled={isLoading || otp.length !== 6}
					className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? "Verifying..." : "Verify Code"}
				</button>

				<button
					onClick={() => {
						setStep("email");
						setOtp("");
						setError("");
					}}
					className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
				>
					<ArrowLeft className="w-3 h-3" />
					Change email
				</button>
			</div>
		);
	}

	// Step 3: New Password
	return (
		<div className={cn("w-full", className)}>
			<StepIndicator />
			<div className="text-center mb-6">
				<div className="mx-auto w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
					<Lock className="w-7 h-7 text-green-500" />
				</div>
				<h2 className="text-2xl font-semibold">Set new password</h2>
				<p className="text-muted-foreground text-sm mt-2">
					Create a strong password for your account
				</p>
			</div>

			<div className="w-full flex flex-col gap-3 mb-2">
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
						<Lock className="w-4 h-4" />
					</span>
					<input
						placeholder="New password"
						type={showPassword ? "text" : "password"}
						value={newPassword}
						disabled={isLoading}
						className="w-full pl-10 pr-10 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/50 text-foreground text-sm"
						onChange={(e) => setNewPassword(e.target.value)}
						onKeyDown={handleKeyPress}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
					</button>
				</div>
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
						<Lock className="w-4 h-4" />
					</span>
					<input
						placeholder="Confirm new password"
						type={showConfirmPassword ? "text" : "password"}
						value={confirmPassword}
						disabled={isLoading}
						className="w-full pl-10 pr-10 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/50 text-foreground text-sm"
						onChange={(e) => setConfirmPassword(e.target.value)}
						onKeyDown={handleKeyPress}
					/>
					<button
						type="button"
						onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
					</button>
				</div>
				{error && (
					<div className="text-sm text-destructive text-left">{error}</div>
				)}
			</div>

			<button
				onClick={handleResetPassword}
				disabled={isLoading}
				className="w-full bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading ? "Resetting..." : "Reset Password"}
			</button>
		</div>
	);
}
