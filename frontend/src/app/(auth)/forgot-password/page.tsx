"use client";

import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/lib/api';
import { toast } from 'sonner';
import { ForgotPassword } from '@/components/ui/forgot-password';

export default function ForgotPasswordPage() {
    const router = useRouter();

    const handleSubmit = async (email: string) => {
        try {
            const res = await forgotPassword(email);
            toast.success("Reset link sent!", {
                description: res.message,
            });
            // Note: In a full implementation, you would handle the reset token here
            // For now, the success state in ForgotPassword component will be shown
        } catch (error: unknown) {
            throw new Error(error instanceof Error ? error.message : "Request failed");
        }
    };

    return (
        <ForgotPassword
            onSubmit={handleSubmit}
            onBackToSignIn={() => router.push('/login')}
        />
    );
}
