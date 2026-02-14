"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

/* ---- Aurora Background ---- */
function AuroraBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Primary aurora blob */}
            <motion.div
                className="absolute w-[900px] h-[600px] rounded-full opacity-[0.12]"
                style={{
                    background: "radial-gradient(ellipse, hsl(var(--aurora-1)), transparent 70%)",
                    filter: "blur(100px)",
                    top: "-15%",
                    left: "15%",
                }}
                animate={{
                    x: [0, 60, -20, 0],
                    y: [0, -40, 20, 0],
                    scale: [1, 1.08, 0.95, 1],
                }}
                transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
            />
            {/* Accent aurora blob */}
            <motion.div
                className="absolute w-[700px] h-[500px] rounded-full opacity-[0.08]"
                style={{
                    background: "radial-gradient(ellipse, hsl(var(--aurora-2)), transparent 70%)",
                    filter: "blur(100px)",
                    top: "10%",
                    right: "5%",
                }}
                animate={{
                    x: [0, -50, 30, 0],
                    y: [0, 30, -20, 0],
                    scale: [1, 0.95, 1.06, 1],
                }}
                transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
            />
            {/* Tertiary blob */}
            <motion.div
                className="absolute w-[500px] h-[400px] rounded-full opacity-[0.06]"
                style={{
                    background: "radial-gradient(ellipse, hsl(var(--aurora-3)), transparent 70%)",
                    filter: "blur(80px)",
                    bottom: "5%",
                    left: "30%",
                }}
                animate={{
                    x: [0, 40, -30, 0],
                    y: [0, -20, 30, 0],
                }}
                transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
            />

            {/* Spotlight conic gradient */}
            <div className="absolute inset-0 spotlight opacity-60" />

            {/* Noise grain overlay */}
            <div className="absolute inset-0 noise opacity-50" style={{ zIndex: 2 }}>
                <div className="absolute inset-0" />
            </div>

            {/* Dot grid */}
            <div className="absolute inset-0 dot-grid opacity-30" />

            {/* Top fade for nav blend */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
        </div>
    );
}

/* ---- Animated Word Reveal ---- */
function AnimatedHeadline() {
    const line1 = ["Ship", "production", "code"];
    const line2 = ["not", "prototypes."];

    return (
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05]">
            <span className="block">
                {line1.map((word, i) => (
                    <span key={i} className="inline-block overflow-hidden mr-[0.28em]">
                        <motion.span
                            className="inline-block text-foreground"
                            initial={{ y: "110%" }}
                            animate={{ y: 0 }}
                            transition={{
                                duration: 0.7,
                                delay: 0.4 + i * 0.08,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            {word}
                        </motion.span>
                    </span>
                ))}
            </span>
            <span className="block mt-1">
                {line2.map((word, i) => (
                    <span key={i} className="inline-block overflow-hidden mr-[0.28em]">
                        <motion.span
                            className={`inline-block ${i === line2.length - 1
                                    ? "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer"
                                    : "text-foreground/50"
                                }`}
                            initial={{ y: "110%" }}
                            animate={{ y: 0 }}
                            transition={{
                                duration: 0.7,
                                delay: 0.6 + i * 0.08,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            {word}
                        </motion.span>
                    </span>
                ))}
            </span>
        </h1>
    );
}

/* ---- Code Window Preview ---- */
function CodeWindow() {
    const lines = [
        { num: 1, content: "// RyzeCanvas generates this for you", cls: "text-foreground/30 italic" },
        { num: 2, content: "", cls: "" },
        { num: 3, content: "export function Dashboard() {", cls: "text-primary" },
        { num: 4, content: "  const { data } = useAnalytics()", cls: "text-foreground/60" },
        { num: 5, content: "", cls: "" },
        { num: 6, content: "  return (", cls: "text-foreground/60" },
        { num: 7, content: '    <main className="grid gap-6 p-8">', cls: "text-accent" },
        { num: 8, content: "      <MetricCard", cls: "text-primary/80" },
        { num: 9, content: '        title="Revenue"', cls: "text-emerald-400/70" },
        { num: 10, content: '        value={data.revenue}', cls: "text-foreground/50" },
        { num: 11, content: "        trend={+12.5}", cls: "text-emerald-400/70" },
        { num: 12, content: "      />", cls: "text-primary/80" },
        { num: 13, content: "      <AreaChart data={data.series} />", cls: "text-accent/70" },
        { num: 14, content: "    </main>", cls: "text-accent" },
        { num: 15, content: "  )", cls: "text-foreground/60" },
        { num: 16, content: "}", cls: "text-primary" },
    ];

    return (
        <motion.div
            className="relative w-full max-w-3xl mx-auto mt-16 md:mt-20"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent rounded-3xl blur-3xl opacity-60" />

            <div className="relative rounded-2xl border border-white/[0.06] bg-background/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.04] bg-white/[0.02]">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <div className="flex-1 text-center">
                        <span className="text-[11px] text-foreground/25 font-mono tracking-wide">dashboard.tsx</span>
                    </div>
                    <div className="w-12" />
                </div>

                {/* Code body */}
                <div className="p-5 md:p-6 font-mono text-[13px] leading-relaxed">
                    {lines.map((line, idx) => (
                        <motion.div
                            key={line.num}
                            className="flex"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 + idx * 0.04, duration: 0.3 }}
                        >
                            <span className="w-8 shrink-0 text-right pr-4 text-foreground/15 select-none text-xs leading-relaxed">
                                {line.num}
                            </span>
                            <span className={line.cls || "text-foreground/60"}>
                                {line.content || "\u00A0"}
                            </span>
                        </motion.div>
                    ))}

                    {/* Cursor blink */}
                    <motion.div
                        className="flex mt-0.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.0 }}
                    >
                        <span className="w-8 shrink-0 text-right pr-4 text-foreground/15 select-none text-xs leading-relaxed">
                            17
                        </span>
                        <motion.span
                            className="inline-block w-2 h-4 bg-primary/70 rounded-sm"
                            animate={{ opacity: [1, 1, 0, 0] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear", times: [0, 0.49, 0.5, 1] }}
                        />
                    </motion.div>
                </div>

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
            </div>
        </motion.div>
    );
}

/* ---- Main Hero ---- */
export function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });
    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden"
        >
            {/* Parallax aurora */}
            <motion.div className="absolute inset-0" style={{ y: bgY }}>
                <AuroraBackground />
            </motion.div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 w-full">
                {/* Badge */}
                <motion.div
                    className="flex justify-center mb-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        <span className="text-xs font-medium tracking-wide text-foreground/60">
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
                    className="text-center text-lg sm:text-xl text-foreground/45 max-w-2xl mx-auto leading-relaxed font-body"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                    Describe what you need. RyzeCanvas generates production-ready React & Next.js
                    code with real components, not placeholder mockups.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
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
                        See How It Works
                    </Link>
                </motion.div>

                {/* Code window */}
                <CodeWindow />
            </div>
        </section>
    );
}
