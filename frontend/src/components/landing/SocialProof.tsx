"use client";

import { motion } from 'framer-motion';
import { useRef } from 'react';

const companies = [
    { name: 'Stripe', opacity: 0.5 },
    { name: 'Vercel', opacity: 0.6 },
    { name: 'Linear', opacity: 0.55 },
    { name: 'Figma', opacity: 0.5 },
    { name: 'Notion', opacity: 0.6 },
    { name: 'OpenAI', opacity: 0.55 },
];

export function SocialProof() {
    return (
        <section className="relative py-20 border-y border-border/30 overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />

            <div className="container relative z-10">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60 font-semibold mb-2">
                        Trusted by teams at
                    </p>
                    <motion.div
                        className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    />
                </motion.div>

                <div className="flex items-center justify-center gap-8 md:gap-16 lg:gap-20 flex-wrap px-4">
                    {companies.map((company, i) => (
                        <motion.div
                            key={company.name}
                            className="relative group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            {/* Glow effect on hover */}
                            <motion.div
                                className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-lg blur-xl transition-colors duration-500"
                                style={{ scale: 1.5 }}
                            />

                            <motion.span
                                className="relative block text-xl md:text-2xl font-bold tracking-tight select-none transition-all duration-300"
                                style={{
                                    opacity: company.opacity,
                                    color: 'hsl(var(--foreground))',
                                }}
                                whileHover={{
                                    opacity: 1,
                                    scale: 1.1,
                                    color: 'hsl(var(--primary))',
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                {company.name}
                            </motion.span>
                        </motion.div>
                    ))}
                </div>

                {/* Stats section */}
                <motion.div
                    className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.6 }}
                >
                    {[
                        { label: 'Code Generated', value: '1M+', suffix: 'lines' },
                        { label: 'Active Users', value: '50K+', suffix: 'developers' },
                        { label: 'Components', value: '500+', suffix: 'templates' },
                        { label: 'Success Rate', value: '99.9%', suffix: 'uptime' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="text-center group"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                        >
                            <motion.div
                                className="text-3xl md:text-4xl font-black gradient-text mb-1"
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                            >
                                {stat.value}
                            </motion.div>
                            <div className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
                                {stat.label}
                            </div>
                            <div className="text-xs text-muted-foreground/40 mt-1">
                                {stat.suffix}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
