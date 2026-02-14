"use client";

import { motion } from "framer-motion";
import {
    Cpu,
    Code2,
    Zap,
    GitBranch,
    Rocket,
    Layers,
} from "lucide-react";
import { useState, useRef, type MouseEvent } from "react";

const features = [
    {
        icon: Cpu,
        title: "Deterministic AI",
        description:
            "Predictable, testable, production-grade output. No hallucinations, no guesswork — just reliable code you can ship.",
        gradient: "from-blue-500/20 to-cyan-500/20",
        iconColor: "text-blue-400",
        span: "md:col-span-2",
    },
    {
        icon: Code2,
        title: "Component-First",
        description:
            "Built on battle-tested design systems. Every component is accessible, composable, and cohesive out of the box.",
        gradient: "from-violet-500/20 to-purple-500/20",
        iconColor: "text-violet-400",
        span: "",
    },
    {
        icon: Zap,
        title: "Real-time Generation",
        description:
            "Watch your code materialise as you describe it. Instant visual feedback with hot-reload previews.",
        gradient: "from-amber-500/20 to-orange-500/20",
        iconColor: "text-amber-400",
        span: "",
    },
    {
        icon: Layers,
        title: "Smart RAG Retrieval",
        description:
            "Powered by FAISS vector search. RyzeCanvas learns from 500+ production component patterns to generate contextually perfect code every time.",
        gradient: "from-emerald-500/20 to-teal-500/20",
        iconColor: "text-emerald-400",
        span: "md:col-span-2",
    },
    {
        icon: GitBranch,
        title: "GitHub Integration",
        description:
            "Commit and push directly to your repositories. Branches, PRs, and CI/CD pipelines built right in.",
        gradient: "from-orange-500/20 to-red-500/20",
        iconColor: "text-orange-400",
        span: "",
    },
    {
        icon: Rocket,
        title: "One-Click Deploy",
        description:
            "Deploy to Vercel, Netlify, or your own infra with a single click. Zero config needed.",
        gradient: "from-pink-500/20 to-rose-500/20",
        iconColor: "text-pink-400",
        span: "",
    },
];

/* ------------------------------------------------------------------ */
/*  Spotlight Bento Card (21st.dev-inspired mouse-following glow)      */
/* ------------------------------------------------------------------ */
function BentoCard({
    feature,
    index,
}: {
    feature: (typeof features)[0];
    index: number;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }

    return (
        <motion.div
            className={`group relative ${feature.span}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
                duration: 0.5,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative h-full overflow-hidden rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm p-7 md:p-8 transition-all duration-500 hover:border-white/[0.08] hover:bg-white/[0.035]"
            >
                {/* Spotlight – radial gradient follows the cursor */}
                <div
                    className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.06), transparent 40%)`,
                    }}
                />

                {/* Static hover gradient fallback */}
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl -z-10`}
                />

                {/* Border glow that follows cursor */}
                <div
                    className="absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.08), transparent 40%)`,
                        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        maskComposite: "exclude",
                        WebkitMaskComposite: "xor",
                        padding: "1px",
                    }}
                />

                {/* Icon */}
                <div className="relative mb-5">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.04] group-hover:border-white/[0.08] transition-colors duration-300">
                        <feature.icon
                            className={`h-5 w-5 ${feature.iconColor} transition-transform duration-500 group-hover:scale-110`}
                        />
                    </div>
                </div>

                {/* Content */}
                <h3 className="relative font-display text-lg font-semibold text-foreground mb-2 tracking-tight">
                    {feature.title}
                </h3>
                <p className="relative text-sm text-foreground/40 leading-relaxed group-hover:text-foreground/55 transition-colors duration-300">
                    {feature.description}
                </p>

                {/* Bottom line */}
                <motion.div
                    className="relative mt-6 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.07 + 0.3 }}
                />
            </div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Features Section                                                   */
/* ------------------------------------------------------------------ */
export function Features() {
    return (
        <section id="features" className="relative py-32 overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04]"
                    style={{
                        background:
                            "radial-gradient(circle, hsl(var(--aurora-1)), transparent 70%)",
                        filter: "blur(80px)",
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.04, 0.07, 0.04],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 14,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Section header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-foreground/50 mb-6"
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.05 }}
                    >
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        Features
                    </motion.div>

                    <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
                        Everything you need to{" "}
                        <span className="gradient-text">ship faster</span>
                    </h2>
                    <p className="text-foreground/40 max-w-xl mx-auto text-lg leading-relaxed">
                        A complete AI-powered toolkit for generating, previewing,
                        and deploying production-grade code.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                        <BentoCard
                            key={feature.title}
                            feature={feature}
                            index={index}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
