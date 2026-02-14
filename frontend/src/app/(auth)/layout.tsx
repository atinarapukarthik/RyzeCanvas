"use client";

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 selection:bg-primary/30 relative overflow-hidden">
            {/* Ambient glow orbs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-[hsl(var(--aurora-1)/0.08)] blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[hsl(var(--aurora-2)/0.06)] blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-[420px]"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-300">
                        <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-foreground">RyzeCanvas</span>
                </Link>

                {/* Card */}
                <div className="rounded-2xl border border-[hsl(var(--glass-border)/0.4)] bg-[hsl(var(--glass-bg)/0.7)] backdrop-blur-2xl p-8 shadow-2xl shadow-black/20">
                    {children}
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-muted-foreground/50">
                    Protected by enterprise-grade encryption
                </p>
            </motion.div>
        </div>
    );
}
