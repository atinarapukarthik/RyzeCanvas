"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

/* ---- Animated Word Reveal ---- */
function AnimatedHeadline() {
    return (
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05] text-foreground">
            Ship production code<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                not prototypes.
            </span>
        </h1>
    );
}

/* ---- Code Window Preview ---- */
function CodeWindow() {
    const lines = [
        { num: 1, content: "// RyzeCanvas generates this for you", cls: "text-muted-foreground italic" },
        { num: 2, content: "", cls: "" },
        { num: 3, content: "export function Dashboard() {", cls: "text-primary" },
        { num: 4, content: "  const { data } = useAnalytics()", cls: "text-foreground" },
        { num: 5, content: "", cls: "" },
        { num: 6, content: "  return (", cls: "text-foreground" },
        { num: 7, content: '    <main className="grid gap-6 p-8">', cls: "text-accent" },
        { num: 8, content: "      <MetricCard", cls: "text-primary/80" },
        { num: 9, content: '        title="Revenue"', cls: "text-emerald-500" },
        { num: 10, content: '        value={data.revenue}', cls: "text-foreground" },
        { num: 11, content: "        trend={+12.5}", cls: "text-emerald-500" },
        { num: 12, content: "      />", cls: "text-primary/80" },
        { num: 13, content: "      <AreaChart data={data.series} />", cls: "text-accent" },
        { num: 14, content: "    </main>", cls: "text-accent" },
        { num: 15, content: "  )", cls: "text-foreground" },
        { num: 16, content: "}", cls: "text-primary" },
    ];

    return (
        <motion.div
            className="relative w-full max-w-3xl mx-auto mt-16 md:mt-20"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Soft Glow behind */}
            <div className="absolute -inset-8 bg-primary/10 rounded-3xl blur-3xl opacity-50" />

            <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="flex-1 text-center">
                        <span className="text-[11px] text-muted-foreground font-mono tracking-wide">dashboard.tsx</span>
                    </div>
                    <div className="w-12" />
                </div>

                {/* Code body */}
                <div className="p-5 md:p-6 font-mono text-[13px] leading-relaxed overflow-x-auto">
                    {lines.map((line) => (
                        <div key={line.num} className="flex">
                            <span className="w-8 shrink-0 text-right pr-4 text-muted-foreground/30 select-none text-xs leading-relaxed">
                                {line.num}
                            </span>
                            <span className={line.cls || "text-foreground"}>
                                {line.content || "\u00A0"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/* ---- Main Hero ---- */
export function Hero() {
    const sectionRef = useRef<HTMLElement>(null);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden bg-background"
        >
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 w-full">
                {/* Badge */}
                <motion.div
                    className="flex justify-center mb-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-muted/50 px-4 py-1.5 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-foreground/80">
                            Now in Public Beta
                        </span>
                    </div>
                </motion.div>

                {/* Headline */}
                <div className="text-center mb-8">
                    <AnimatedHeadline />
                </div>

                {/* Subtitle */}
                <motion.p
                    className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    Describe what you need. RyzeCanvas generates production-ready React & Next.js
                    code with real components, not placeholder mockups.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Link
                        href="/register"
                        className="group relative inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:shadow-primary/20"
                    >
                        Start Building Free
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="#features"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                        See How It Works
                    </Link>
                </motion.div>

                {/* Code window */}
                <CodeWindow />
            </div>
        </section>
    );
}
