"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t py-12 bg-background">
            <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>RyzeCanvas</span>
                </div>
                <p className="text-sm text-muted-foreground">© 2026 RyzeCanvas. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <Link href="#" className="text-muted-foreground hover:text-foreground">Privacy</Link>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">Terms</Link>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">Twitter</Link>
                </div>
            </div>
        </footer>
    );
}
