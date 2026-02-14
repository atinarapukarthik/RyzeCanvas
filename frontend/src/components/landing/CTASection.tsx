"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTASection() {
    return (
        <section className="relative py-32 overflow-hidden">
            {/* Ambient aurora */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full opacity-[0.07]"
                    style={{
                        background: "radial-gradient(ellipse, hsl(var(--aurora-1)), transparent 70%)",
                        filter: "blur(100px)",
                    }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.07, 0.12, 0.07] }}
                    transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04]"
                    style={{
                        background: "radial-gradient(ellipse, hsl(var(--aurora-2)), transparent 70%)",
                        filter: "blur(80px)",
                    }}
                    animate={{ scale: [1.1, 1, 1.1], opacity: [0.04, 0.08, 0.04] }}
                    transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
                />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
                <motion.div
                    className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Inner gradient glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

                    <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
                        {/* Headline */}
                        <motion.h2
                            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                        >
                            Ready to build{" "}
                            <span className="gradient-text">10x faster</span>?
                        </motion.h2>

                        {/* Sub */}
                        <motion.p
                            className="text-foreground/40 text-lg max-w-lg mx-auto leading-relaxed mb-10"
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.15 }}
                        >
                            Join thousands of developers shipping production-grade applications in minutes, not days. Free for personal projects.
                        </motion.p>

                        {/* Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            <Link
                                href="/register"
                                className="group relative inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.5)] hover:brightness-110"
                            >
                                Start Building Free
                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                            </Link>
                            <Link
                                href="#features"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-8 py-3.5 text-sm font-medium text-foreground/70 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground"
                            >
                                View Documentation
                            </Link>
                        </motion.div>

                        {/* Social proof row */}
                        <motion.div
                            className="flex flex-col sm:flex-row items-center justify-center gap-5 text-sm text-foreground/35"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.35 }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex -space-x-2">
                                    {[
                                        "bg-gradient-to-br from-blue-400 to-violet-400",
                                        "bg-gradient-to-br from-emerald-400 to-cyan-400",
                                        "bg-gradient-to-br from-amber-400 to-orange-400",
                                        "bg-gradient-to-br from-pink-400 to-rose-400",
                                    ].map((gradient, i) => (
                                        <motion.div
                                            key={i}
                                            className={`w-7 h-7 rounded-full ${gradient} border-2 border-background`}
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.4 + i * 0.05 }}
                                        />
                                    ))}
                                </div>
                                <span className="font-medium text-foreground/50">
                                    50K+ developers
                                </span>
                            </div>
                            <span className="hidden sm:block h-3.5 w-px bg-foreground/10" />
                            <span>No credit card required</span>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
