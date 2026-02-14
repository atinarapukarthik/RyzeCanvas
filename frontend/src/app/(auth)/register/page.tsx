"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register as registerAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const passwordChecks = {
        length: password.length >= 8,
        hasNumber: /\d/.test(password),
    };
    const passwordStrong = passwordChecks.length && passwordChecks.hasNumber;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordStrong) {
            toast.error("Password too weak", { description: "Must be at least 8 characters with a number." });
            return;
        }
        setLoading(true);
        try {
            await registerAPI(email, password, fullName);
            toast.success("Account created successfully!", {
                description: "You can now sign in with your credentials."
            });
            router.push('/login');
        } catch (error: unknown) {
            toast.error("Registration failed", { description: error instanceof Error ? error.message : "An unknown error occurred" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Create an account</h1>
                <p className="text-sm text-muted-foreground">Join the elite club of AI-driven builders</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            id="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl transition-colors"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                    {/* Password strength indicators */}
                    {password.length > 0 && (
                        <div className="flex gap-3 mt-2">
                            <span className={`flex items-center gap-1 text-[11px] ${passwordChecks.length ? 'text-[hsl(var(--success))]' : 'text-muted-foreground/50'}`}>
                                <Check className="h-3 w-3" /> 8+ chars
                            </span>
                            <span className={`flex items-center gap-1 text-[11px] ${passwordChecks.hasNumber ? 'text-[hsl(var(--success))]' : 'text-muted-foreground/50'}`}>
                                <Check className="h-3 w-3" /> Number
                            </span>
                        </div>
                    )}
                </div>

                <Button type="submit" variant="glow" className="w-full h-11 rounded-xl shadow-lg shadow-primary/10 mt-1 font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
            </form>

            {/* Sign in link */}
            <p className="text-center text-sm text-muted-foreground mt-7">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">Sign in</Link>
            </p>
        </>
    );
}
