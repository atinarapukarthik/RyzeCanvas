import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen mesh-gradient flex flex-col items-center justify-center p-4 selection:bg-primary/30">
            <Link href="/" className="flex items-center gap-2 mb-8 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-foreground">RyzeCanvas</span>
            </Link>
            <div className="w-full max-w-md glass-strong rounded-2xl p-8 shadow-2xl border-white/5 animate-fade-in-up">
                {children}
            </div>
        </div>
    );
}
