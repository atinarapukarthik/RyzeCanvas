"use client";

import { useRouter } from 'next/navigation';
import { register as registerAPI } from '@/lib/api';
import { toast } from 'sonner';
import { SignUp } from '@/components/ui/clean-minimal-sign-up';

export default function RegisterPage() {
    const router = useRouter();

    const handleSubmit = async (name: string, email: string, password: string) => {
        try {
            await registerAPI(email, password, name);
            toast.success("Account created successfully!", {
                description: "You can now sign in with your credentials."
            });
            router.push('/login');
        } catch (error: unknown) {
            throw new Error(error instanceof Error ? error.message : "Registration failed");
        }
    };

    return (
        <SignUp
            onSubmit={handleSubmit}
            onSignInClick={() => router.push('/login')}
        />
    );
}
