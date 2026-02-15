"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { CTASection } from "@/components/landing/CTASection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, MessageSquare, Eye, Rocket, Github, Twitter, Linkedin } from "lucide-react";

/* ──────────────────────────────────────────────────────
   How It Works - three-step process section
   ────────────────────────────────────────────────────── */
const steps = [
    {
        num: "01",
        icon: MessageSquare,
        title: "Describe",
        description:
            "Tell RyzeCanvas what you need in plain English. Describe a dashboard, a form, an entire page — whatever you're building.",
        accent: "from-blue-500 to-cyan-500",
    },
    {
        num: "02",
        icon: Eye,
        title: "Preview",
        description:
            "Watch as production-ready React code generates in real-time. Preview it live, tweak with natural language, iterate instantly.",
        accent: "from-violet-500 to-purple-500",
    },
    {
        num: "03",
        icon: Rocket,
        title: "Ship",
        description:
            "Push to GitHub with one click, deploy to Vercel or Netlify. Your code is clean, typed, and ready for production.",
        accent: "from-amber-500 to-orange-500",
    },
];

function HowItWorks() {
    return (
        <section id="how-it-works" className="relative py-32 overflow-hidden bg-background">
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/20 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6"
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.05 }}
                    >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        How it works
                    </motion.div>

                    <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
                        Three steps to{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">production</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
                        From idea to deployed application in minutes, not days.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.num}
                            className="group relative"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.5,
                                delay: i * 0.1,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            <div className="relative h-full rounded-2xl border border-border/50 bg-card/40 p-8 transition-all duration-500 hover:border-border hover:bg-card">
                                {/* Step number */}
                                <span className="font-display text-5xl font-bold text-muted-foreground/[0.1] absolute top-6 right-6 select-none">
                                    {step.num}
                                </span>

                                {/* Icon */}
                                <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl mb-6">
                                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.accent} opacity-[0.2]`} />
                                    <step.icon className="h-5 w-5 text-foreground/80 relative z-10" />
                                </div>

                                {/* Content */}
                                <h3 className="font-display text-xl font-semibold text-foreground mb-3 tracking-tight">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                            </div>

                            {/* Connector line (not on last) */}
                            {i < steps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-border/50 to-transparent" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────────────────
   Footer
   ────────────────────────────────────────────────────── */
const footerSections = [
    {
        title: "Product",
        links: ["Features", "Pricing", "Changelog", "Roadmap"],
    },
    {
        title: "Resources",
        links: ["Documentation", "API Reference", "Examples", "Community"],
    },
    {
        title: "Company",
        links: ["About", "Blog", "Careers", "Contact"],
    },
];

function Footer() {
    return (
        <footer className="relative border-t border-border bg-card/20 overflow-hidden">
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
                <div className="grid md:grid-cols-5 gap-10 md:gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 mb-4 group w-fit"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-display text-base font-bold tracking-tight text-foreground">
                                Ryze<span className="text-primary">Canvas</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
                            AI-powered code generation for modern teams. Ship
                            production-ready React & Next.js applications at the
                            speed of thought.
                        </p>
                        {/* Social icons */}
                        <div className="flex gap-2">
                            {[
                                { icon: Github, label: "GitHub" },
                                { icon: Twitter, label: "Twitter" },
                                { icon: Linkedin, label: "LinkedIn" },
                            ].map(({ icon: Icon, label }) => (
                                <a
                                    key={label}
                                    href="#"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-300 hover:text-foreground hover:border-primary/50"
                                    aria-label={label}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {footerSections.map((section) => (
                        <div key={section.title}>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                {section.title}
                            </h4>
                            <ul className="space-y-2.5">
                                {section.links.map((item) => (
                                    <li key={item}>
                                        <a
                                            href="#"
                                            className="text-sm text-muted-foreground/80 transition-colors duration-200 hover:text-foreground"
                                        >
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-border mb-6" />

                {/* Bottom */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
                    <p>&copy; 2026 RyzeCanvas. All rights reserved.</p>
                    <div className="flex gap-5">
                        {["Privacy", "Terms", "Security"].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className="transition-colors duration-200 hover:text-foreground"
                            >
                                {item}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

/* ──────────────────────────────────────────────────────
   Landing Page
   ────────────────────────────────────────────────────── */
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background relative">
            <Navbar />
            <main>
                <Hero />
                <SocialProof />
                <Features />
                <HowItWorks />
                <PricingSection />
                <TestimonialsSection />
                <CTASection />
            </main>
            <Footer />
        </div>
    );
}
