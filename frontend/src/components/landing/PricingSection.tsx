"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";

const plans = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for personal projects and learning",
        features: [
            "5 projects",
            "100 generations/month",
            "Basic components library",
            "Community support",
            "Standard preview",
            "Export to GitHub",
        ],
        cta: "Get Started Free",
        href: "/register",
        popular: false,
    },
    {
        name: "Pro",
        price: "$29",
        period: "per month",
        description: "For professional developers building production apps",
        features: [
            "Unlimited projects",
            "Unlimited generations",
            "Advanced RAG components",
            "Priority support (24h response)",
            "Real-time collaboration",
            "Export to GitHub",
            "Vercel/Netlify deploy",
            "Custom design system",
            "AI code reviews",
        ],
        cta: "Start Pro Trial",
        href: "/register?plan=pro",
        popular: true,
    },
    {
        name: "Team",
        price: "$99",
        period: "per month",
        description: "For teams shipping at scale",
        features: [
            "Everything in Pro",
            "Up to 10 team members",
            "Shared component library",
            "Team collaboration tools",
            "Advanced analytics",
            "SSO & SAML",
            "Dedicated support",
            "Custom AI training",
            "SLA guarantee",
        ],
        cta: "Contact Sales",
        href: "mailto:support@ryzecanvas.com",
        popular: false,
    },
];

function PricingCard({ plan, index }: { plan: typeof plans[0]; index: number }) {
    return (
        <motion.div
            className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-500 ${plan.popular
                ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-glow-sm scale-105"
                : "border-border bg-card/40 hover:border-border/80 hover:bg-card/60"
                }`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {/* Popular badge */}
            {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">Most Popular</span>
                    </div>
                </div>
            )}

            {/* Plan header */}
            <div className="mb-5">
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display text-4xl font-bold tracking-tight text-foreground">
                        {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                </p>
            </div>

            {/* Features list */}
            <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                    <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + i * 0.05 }}
                    >
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                            <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/80 leading-relaxed">
                            {feature}
                        </span>
                    </motion.li>
                ))}
            </ul>

            {/* CTA Button */}
            <Link
                href={plan.href}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${plan.popular
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:brightness-110 hover:shadow-glow-sm"
                    : "border border-border bg-background hover:bg-accent/10 hover:border-primary/50 text-foreground"
                    }`}
            >
                {plan.cta}
                {plan.popular && <Zap className="h-4 w-4" />}
            </Link>
        </motion.div>
    );
}

export function PricingSection() {
    return (
        <section id="pricing" className="relative py-32 overflow-hidden bg-background">
            {/* Background effects */}
            <div className="absolute inset-0 bg-grid-white pointer-events-none opacity-[0.02] dark:opacity-20" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
                {/* Section header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/10 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6"
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.05 }}
                    >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Pricing
                    </motion.div>

                    <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
                        Start free, scale as you{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            grow
                        </span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                        Choose the plan that fits your workflow. All plans include our core AI generation engine.
                    </p>
                </motion.div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan, index) => (
                        <PricingCard key={plan.name} plan={plan} index={index} />
                    ))}
                </div>

                {/* FAQ teaser */}
                <motion.div
                    className="mt-16 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                >
                    <p className="text-sm text-muted-foreground">
                        Questions?{" "}
                        <Link
                            href="#pricing"
                            className="text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
                        >
                            View our FAQ
                        </Link>{" "}
                        or{" "}
                        <Link
                            href="mailto:support@ryzecanvas.com"
                            className="text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
                        >
                            contact our team
                        </Link>
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
