"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ForgotPassword } from "@/components/ui/forgot-password";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const handleSendOtp = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            throw new Error(error.message);
        }
        toast.success("Verification code sent!", {
            description: "Check your email for the 6-digit code.",
        });
    };

    const handleVerifyOtp = async (email: string, otp: string) => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "recovery",
        });
        if (error) {
            throw new Error(error.message);
        }
        toast.success("Code verified!", {
            description: "You can now set your new password.",
        });
    };

    const handleResetPassword = async (_email: string, newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            throw new Error(error.message);
        }
        toast.success("Password reset successful!", {
            description: "You can now sign in with your new password.",
        });
        router.push("/login");
    };

    return (
        <ForgotPassword
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
            onResetPassword={handleResetPassword}
            onBackToSignIn={() => router.push("/login")}
        />
    );
}
