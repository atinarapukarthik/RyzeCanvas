"use client";

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { login as loginAPI } from '@/lib/api';
import { toast } from 'sonner';
import { SignIn } from '@/components/ui/clean-minimal-sign-in';

export default function LoginPage() {
    const setUser = useAuthStore((s) => s.setUser);
    const router = useRouter();

    const handleSubmit = async (email: string, password: string) => {
        try {
            const res = await loginAPI(email, password);
            setUser(res.user, res.token);
            toast.success(`Welcome back, ${res.user.full_name || 'User'}!`);
            router.push(res.user.role === 'admin' ? '/admin' : '/dashboard');
        } catch (error: unknown) {
            throw new Error(error instanceof Error ? error.message : "Login failed");
        }
    };

    return (
        <SignIn
            onSubmit={handleSubmit}
            onForgotPassword={() => router.push('/forgot-password')}
            onSignUpClick={() => router.push('/register')}
        />
    );
}
