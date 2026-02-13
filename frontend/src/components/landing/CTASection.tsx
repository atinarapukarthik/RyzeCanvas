"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export function CTASection() {
    return (
        <section className="relative py-32 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10"
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        repeat: Infinity,
                        repeatType: 'reverse',
                        duration: 20,
                    }}
                    style={{ backgroundSize: '200% 200%' }}
                />

                {/* Floating orbs */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/30 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 10,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/25 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, -50, 0],
                        y: [0, 40, 0],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 12,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            <div className="container relative z-10 max-w-5xl">
                <motion.div
                    className="glass-strong rounded-3xl p-12 md:p-16 border border-border/40 relative overflow-hidden"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl" />

                    <div className="relative">
                        {/* Badge */}
                        <motion.div
                            className="flex justify-center mb-8"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm font-medium">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span>Start Building Today</span>
                            </div>
                        </motion.div>

                        {/* Heading */}
                        <motion.h2
                            className="text-4xl sm:text-5xl lg:text-6xl font-black text-center tracking-tight mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Ready to <span className="gradient-text">10x</span> Your Workflow?
                        </motion.h2>

                        {/* Description */}
                        <motion.p
                            className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-10 leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                        >
                            Join thousands of developers building faster with AI-powered code generation.
                            Free forever for personal projects.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                        >
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="glow" size="lg" className="text-base px-10 h-14 font-semibold" asChild>
                                    <Link href="/login/register">
                                        Get Started Free
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline-glow" size="lg" className="text-base px-10 h-14 font-semibold backdrop-blur-xl" asChild>
                                    <Link href="https://github.com" target="_blank">
                                        <Github className="mr-2 h-5 w-5" />
                                        View on GitHub
                                    </Link>
                                </Button>
                            </motion.div>
                        </motion.div>

                        {/* Social proof */}
                        <motion.div
                            className="flex items-center justify-center gap-8 text-sm text-muted-foreground"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-background"
                                        />
                                    ))}
                                </div>
                                <span className="font-medium">50K+ developers</span>
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <span>✦ No credit card required</span>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
