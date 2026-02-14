"use client";

import { motion } from "framer-motion";

const logos = [
    "Vercel",
    "Stripe",
    "Linear",
    "Notion",
    "Figma",
    "OpenAI",
    "Supabase",
    "Planetscale",
];

/* Simple SVG-text logos to avoid external images */
function LogoMark({ name }: { name: string }) {
    return (
        <span className="text-[15px] font-display font-semibold tracking-wide text-white/20 transition-colors duration-500 group-hover:text-white/50 select-none whitespace-nowrap">
            {name}
        </span>
    );
}

export function SocialProof() {
    const doubled = [...logos, ...logos];

    return (
        <section className="relative py-24 overflow-hidden bg-black">
            {/* Top divider line */}
            <div className="absolute inset-x-0 top-0">
                <div className="mx-auto max-w-5xl h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>

            {/* Label */}
            <motion.p
                className="text-center text-[11px] uppercase tracking-[0.25em] text-white/30 font-medium mb-12"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                Trusted by teams at
            </motion.p>

            {/* Marquee */}
            <div className="relative fade-x">
                <motion.div
                    className="flex gap-16 items-center w-max"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div
                        className="flex gap-16 items-center animate-marquee"
                        style={{ "--marquee-duration": "35s" } as React.CSSProperties}
                    >
                        {doubled.map((name, i) => (
                            <div key={`${name}-${i}`} className="group px-2">
                                <LogoMark name={name} />
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Stats */}
            <motion.div
                className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto px-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {[
                    { value: "1M+", label: "Lines generated" },
                    { value: "50K+", label: "Developers" },
                    { value: "500+", label: "Components" },
                    { value: "99.9%", label: "Uptime" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        className="text-center"
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                    >
                        <div className="font-display text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[hsl(234,89%,74%)] to-[hsl(280,72%,68%)] mb-1">
                            {stat.value}
                        </div>
                        <div className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                            {stat.label}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bottom divider */}
            <div className="absolute inset-x-0 bottom-0">
                <div className="mx-auto max-w-5xl h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>
        </section>
    );
}
