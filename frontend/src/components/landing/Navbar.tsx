"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X } from "lucide-react";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-50"
        >
            <div className="mx-auto max-w-6xl px-4 pt-4">
                <nav
                    className={`relative flex items-center justify-between rounded-2xl border px-5 py-3 transition-all duration-500 ${scrolled
                        ? "border-border bg-background/80 backdrop-blur-2xl shadow-sm"
                        : "border-transparent bg-transparent"
                        }`}
                >
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                            <Sparkles className="h-4 w-4 text-white" />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-60" />
                        </div>
                        <span className="font-display text-lg font-bold tracking-tight text-foreground">
                            Ryze<span className="text-primary">Canvas</span>
                        </span>
                    </Link>

                    {/* Desktop links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="relative px-4 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground rounded-xl hover:bg-accent/50"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-4 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/register"
                            className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)]"
                        >
                            Get Started
                            <svg
                                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-accent/50"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </nav>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-2 overflow-hidden rounded-2xl border border-border bg-background/80 backdrop-blur-2xl md:hidden"
                        >
                            <div className="flex flex-col gap-1 p-3">
                                {navLinks.map((link, i) => (
                                    <motion.div
                                        key={link.label}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                ))}
                                <div className="mt-2 border-t border-border pt-3 flex flex-col gap-2">
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="block rounded-xl px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setMobileOpen(false)}
                                        className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-white"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    );
}
