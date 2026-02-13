"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Mocking API call for now since backend doesn't support forgot-password yet
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            toast.success("Reset link sent!", {
                description: "If an account exists for this email, you will receive a password reset link shortly."
            });
        }, 1500);
    };

    return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Reset password</h1>
                <p className="text-sm text-muted-foreground">
                    {submitted
                        ? "Check your inbox for further instructions."
                        : "Enter your email and we'll send you a link to reset your password."}
                </p>
            </div>

            {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-secondary/50 border-border focus:border-primary/50"
                        />
                    </div>

                    <Button type="submit" variant="glow" className="w-full h-11 shadow-lg shadow-primary/10 mt-2" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
                    </Button>
                </form>
            ) : (
                <Button variant="outline-glow" className="w-full h-11 mt-2" asChild>
                    <Link href="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                    </Link>
                </Button>
            )}

            {!submitted && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                    Remembered your password?{' '}
                    <Link href="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
                </p>
            )}
        </>
    );
}
