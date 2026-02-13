"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Menu, X } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    const navOpacity = useTransform(scrollY, [0, 100], [0.6, 0.95]);
    const navBlur = useTransform(scrollY, [0, 100], [8, 20]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <motion.header
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    backgroundColor: `hsl(var(--glass-bg) / ${isScrolled ? '0.8' : '0.4'})`,
                    backdropFilter: `blur(${isScrolled ? '20px' : '8px'})`,
                    borderBottom: isScrolled ? '1px solid hsl(var(--border) / 0.3)' : '1px solid transparent',
                }}
            >
                <div className="container">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <motion.div
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20"
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                            >
                                <Zap className="h-5 w-5 text-primary-foreground" />
                            </motion.div>
                            <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                                RyzeCanvas
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {[
                                { label: 'Features', href: '#features' },
                                { label: 'Pricing', href: '#pricing' },
                                { label: 'Docs', href: '#docs' },
                                { label: 'Blog', href: '#blog' },
                            ].map((item) => (
                                <motion.a
                                    key={item.label}
                                    href={item.href}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface/50"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {item.label}
                                </motion.a>
                            ))}
                        </nav>

                        {/* Desktop CTA Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="ghost" size="sm" className="font-semibold" asChild>
                                    <Link href="/login">Sign In</Link>
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="glow" size="sm" className="font-semibold" asChild>
                                    <Link href="/login/register">Get Started</Link>
                                </Button>
                            </motion.div>
                        </div>

                        {/* Mobile Menu Button */}
                        <motion.button
                            className="md:hidden p-2 text-foreground"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            whileTap={{ scale: 0.95 }}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </motion.button>
                    </div>
                </div>
            </motion.header>

            {/* Mobile Menu */}
            <motion.div
                className="fixed inset-x-0 top-16 z-40 md:hidden"
                initial={false}
                animate={{
                    height: mobileMenuOpen ? 'auto' : 0,
                    opacity: mobileMenuOpen ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
            >
                <div className="glass-strong border-b border-border/30 p-4 space-y-2">
                    {[
                        { label: 'Features', href: '#features' },
                        { label: 'Pricing', href: '#pricing' },
                        { label: 'Docs', href: '#docs' },
                        { label: 'Blog', href: '#blog' },
                    ].map((item) => (
                        <motion.a
                            key={item.label}
                            href={item.href}
                            className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface/50 rounded-lg transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                            whileTap={{ scale: 0.98 }}
                        >
                            {item.label}
                        </motion.a>
                    ))}
                    <div className="pt-4 space-y-2">
                        <Button variant="ghost" size="sm" className="w-full font-semibold" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button variant="glow" size="sm" className="w-full font-semibold" asChild>
                            <Link href="/login/register">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
