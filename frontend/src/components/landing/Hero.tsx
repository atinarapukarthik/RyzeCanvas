"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles, Code2, Zap, Terminal, Box, Layers } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

function DynamicBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated gradient mesh */}
            <motion.div
                className="absolute inset-0 opacity-40"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary)/0.25), transparent),
                        radial-gradient(ellipse 60% 80% at 10% 80%, hsl(var(--accent)/0.15), transparent),
                        radial-gradient(ellipse 50% 60% at 90% 70%, hsl(var(--primary)/0.15), transparent)
                    `,
                }}
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 12,
                    ease: 'easeInOut',
                }}
            />

            {/* Diagonal grid lines */}
            <div className="absolute inset-0">
                <motion.div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(90deg, hsl(var(--primary)/0.03) 1px, transparent 1px),
                            linear-gradient(0deg, hsl(var(--primary)/0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '80px 80px',
                    }}
                    animate={{
                        backgroundPosition: ['0px 0px', '80px 80px'],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 30,
                        ease: 'linear',
                    }}
                />
            </div>

            {/* Floating geometric shapes */}
            {[
                { top: '15%', left: '8%', delay: 0, size: 120, rotation: 45 },
                { top: '65%', left: '15%', delay: 2, size: 90, rotation: 120 },
                { top: '25%', right: '12%', delay: 1.5, size: 100, rotation: 75 },
                { bottom: '20%', right: '10%', delay: 3, size: 110, rotation: 30 },
            ].map((shape, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        top: shape.top,
                        left: shape.left,
                        right: shape.right,
                        bottom: shape.bottom,
                        width: shape.size,
                        height: shape.size,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        rotate: [shape.rotation, shape.rotation + 180, shape.rotation],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 15 + i * 2,
                        ease: 'easeInOut',
                        delay: shape.delay,
                    }}
                >
                    <div
                        className="w-full h-full rounded-2xl border border-primary/10 bg-primary/5"
                        style={{
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                </motion.div>
            ))}

            {/* Dynamic particles */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-primary/40"
                    style={{
                        top: `${10 + (i * 4.5) % 80}%`,
                        left: `${5 + (i * 7) % 90}%`,
                    }}
                    animate={{
                        opacity: [0, 0.8, 0],
                        scale: [0, 1.5, 0],
                        y: [0, -40],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 4 + (i * 0.3),
                        delay: i * 0.2,
                        ease: 'easeOut',
                    }}
                />
            ))}

            {/* Glow orbs with morphing effect */}
            <motion.div
                className="absolute w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, hsl(var(--primary)/0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    top: '10%',
                    left: '20%',
                }}
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 20,
                    ease: 'easeInOut',
                }}
            />
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, hsl(var(--accent)/0.12) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    top: '40%',
                    right: '15%',
                }}
                animate={{
                    x: [0, -80, 0],
                    y: [0, 60, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 18,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
}

function InteractiveCodePreview() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

    return (
        <motion.div
            ref={ref}
            className="mt-20 max-w-5xl mx-auto px-4"
            style={{ y, opacity }}
        >
            <div className="relative group">
                {/* Decorative elements */}
                <motion.div
                    className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-3xl"
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: 'easeInOut',
                    }}
                />

                <div className="relative glass-strong rounded-2xl overflow-hidden border border-primary/20 shadow-2xl">
                    {/* Browser chrome */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-surface/80">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-destructive/60" />
                            <div className="w-3 h-3 rounded-full bg-warning/60" />
                            <div className="w-3 h-3 rounded-full bg-success/60" />
                        </div>
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-4 py-1.5 border border-border/40">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-xs font-mono text-muted-foreground">ryzecanvas.app/studio</span>
                            </div>
                        </div>
                        <div className="w-20" />
                    </div>

                    {/* Split-pane IDE mockup */}
                    <div className="flex h-[400px]">
                        {/* Chat panel */}
                        <div className="w-2/5 border-r border-border/30 bg-surface/40 p-6 space-y-4">
                            <motion.div
                                className="flex items-start gap-3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                            >
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Terminal className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-foreground leading-relaxed">
                                        Create a modern dashboard with real-time stats
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div
                                className="ml-11 glass rounded-lg p-4 space-y-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 0.5 }}
                            >
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        className="w-2 h-2 rounded-full bg-success"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                    <span className="text-xs text-muted-foreground font-medium">Analyzing requirements...</span>
                                </div>
                                <div className="space-y-2 pt-2">
                                    {[100, 75, 90].map((width, i) => (
                                        <motion.div
                                            key={i}
                                            className="h-2 rounded-full bg-primary/20 overflow-hidden"
                                            style={{ width: `${width}%` }}
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            transition={{ delay: 1.5 + i * 0.2, duration: 0.6 }}
                                        >
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary to-accent"
                                                animate={{ x: ['-100%', '100%'] }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 1.5,
                                                    ease: 'linear',
                                                    delay: 1.5 + i * 0.2,
                                                }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Code panel */}
                        <div className="flex-1 bg-background/60 p-6 font-mono text-sm">
                            <motion.div
                                className="space-y-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2, duration: 0.5 }}
                            >
                                {[
                                    { width: '60%', color: 'text-accent', text: 'import { Dashboard } from' },
                                    { width: '75%', color: 'text-primary', text: 'const stats = [' },
                                    { width: '85%', color: 'text-muted-foreground', text: '  { label: "Users", value: 1234 },' },
                                    { width: '85%', color: 'text-muted-foreground', text: '  { label: "Revenue", value: "$50k" },' },
                                    { width: '65%', color: 'text-primary', text: ']' },
                                    { width: '70%', color: 'text-success', text: '<Grid cols={3}>' },
                                    { width: '80%', color: 'text-muted-foreground', text: '  {stats.map(stat => ...' },
                                ].map((line, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 2.2 + i * 0.1, duration: 0.3 }}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="text-muted-foreground/40 text-xs select-none">{i + 1}</span>
                                        <span className={line.color}>{line.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export function Hero() {
    const containerRef = useRef<HTMLElement>(null);

    return (
        <section ref={containerRef} className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-32 overflow-hidden">
            <DynamicBackground />

            <div className="container relative z-10 max-w-6xl mx-auto px-4">
                {/* Badge */}
                <motion.div
                    className="flex justify-center mb-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass border border-primary/20 text-sm font-medium group hover:border-primary/40 transition-colors cursor-default"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                    >
                        <motion.span
                            className="h-2 w-2 rounded-full bg-success shadow-lg shadow-success/50"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <span className="text-foreground/80">v2.0 —</span>
                        <span className="gradient-text">Zero Hallucinations</span>
                    </motion.div>
                </motion.div>

                {/* Main headline */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6">
                        <span className="block">Code at the</span>
                        <span className="block gradient-text mt-2">Speed of Thought</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed font-medium">
                        AI-powered code generation for React & Next.js.
                        <span className="text-primary"> Production-ready. </span>
                        <span className="text-accent">Deterministic.</span>
                    </p>
                </motion.div>

                {/* CTA buttons */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="glow" size="lg" className="text-base px-10 h-14 font-semibold" asChild>
                            <Link href="/login/register">
                                Start Building Free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline-glow" size="lg" className="text-base px-10 h-14 font-semibold backdrop-blur-xl" asChild>
                            <Link href="/studio">
                                <Play className="mr-2 h-5 w-5" />
                                Watch Demo
                            </Link>
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Feature tags */}
                <motion.div
                    className="flex flex-wrap items-center justify-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                >
                    {[
                        { icon: Code2, label: 'React & Next.js', color: 'text-primary' },
                        { icon: Zap, label: 'Real-time Generation', color: 'text-accent' },
                        { icon: Box, label: 'Component Library', color: 'text-success' },
                        { icon: Layers, label: 'Full-Stack Ready', color: 'text-primary' },
                    ].map(({ icon: Icon, label, color }, i) => (
                        <motion.div
                            key={label}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-border/40 hover:border-primary/40 transition-colors"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className="text-sm font-medium text-foreground/80">{label}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            <InteractiveCodePreview />
        </section>
    );
}
