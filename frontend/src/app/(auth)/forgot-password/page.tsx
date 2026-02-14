"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword, resetPassword } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await forgotPassword(email);
            toast.success("Reset link sent!", {
                description: res.message,
            });
            // In dev mode, the backend returns the token directly
            if (res.reset_token) {
                setResetToken(res.reset_token);
            }
            setStep('reset');
        } catch (error: unknown) {
            toast.error("Request failed", { description: error instanceof Error ? error.message : "An unknown error occurred" });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password too short", { description: "Must be at least 8 characters." });
            return;
        }
        setLoading(true);
        try {
            await resetPassword(resetToken, newPassword);
            toast.success("Password reset successfully!");
            setStep('done');
        } catch (error: unknown) {
            toast.error("Reset failed", { description: error instanceof Error ? error.message : "An unknown error occurred" });
        } finally {
            setLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--success)/0.15)]">
                    <CheckCircle2 className="h-7 w-7 text-[hsl(var(--success))]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Password updated</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Button variant="glow" className="w-full h-11 rounded-xl font-semibold" asChild>
                    <Link href="/login">
                        Back to Sign In
                    </Link>
                </Button>
            </div>
        );
    }

    if (step === 'reset') {
        return (
            <>
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <KeyRound className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Set new password</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                    {/* Show token field if not auto-filled from dev response */}
                    {!resetToken && (
                        <div className="space-y-2">
                            <Label htmlFor="token" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reset Token</Label>
                            <Input
                                id="token"
                                type="text"
                                placeholder="Paste reset token from email"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                required
                                className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors font-mono text-xs"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                id="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors"
                            />
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[11px] text-destructive">Passwords do not match</p>
                        )}
                    </div>

                    <Button type="submit" variant="glow" className="w-full h-11 rounded-xl shadow-lg shadow-primary/10 mt-1 font-semibold" disabled={loading || (!!confirmPassword && newPassword !== confirmPassword)}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
                    </Button>
                </form>

                <button
                    onClick={() => setStep('email')}
                    className="flex items-center justify-center gap-1.5 w-full mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
            </>
        );
    }

    // Step: email
    return (
        <>
            <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Reset password</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you instructions to reset your password.
                </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors"
                        />
                    </div>
                </div>

                <Button type="submit" variant="glow" className="w-full h-11 rounded-xl shadow-lg shadow-primary/10 mt-1 font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-7">
                Remembered your password?{' '}
                <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">Sign in</Link>
            </p>
        </>
    );
}
