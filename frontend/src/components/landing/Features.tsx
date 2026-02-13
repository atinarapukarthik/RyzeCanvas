"use client";

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Shield, Users, GitBranch, Sparkles, Zap, Lock, Cpu, Code2, Rocket } from 'lucide-react';
import { useRef } from 'react';

const features = [
    {
        icon: Cpu,
        title: 'Deterministic AI',
        description: 'Every generation is predictable, testable, and production-ready. Zero hallucinations, 100% reliability.',
        color: 'from-primary/20 to-accent/20',
        iconColor: 'text-primary',
        bgGlow: 'primary',
    },
    {
        icon: Code2,
        title: 'Component-First',
        description: 'Built on battle-tested design systems. Generate cohesive, accessible components that follow best practices.',
        color: 'from-accent/20 to-primary/20',
        iconColor: 'text-accent',
        bgGlow: 'accent',
    },
    {
        icon: Zap,
        title: 'Real-time Updates',
        description: 'Watch code generate in real-time. Instant feedback, live previews, and seamless hot-reload integration.',
        color: 'from-success/20 to-primary/20',
        iconColor: 'text-success',
        bgGlow: 'success',
    },
    {
        icon: Lock,
        title: 'Role-Based Access',
        description: 'Fine-grained permissions for developers, designers, and admins. Control who sees and does what.',
        color: 'from-purple-500/20 to-primary/20',
        iconColor: 'text-purple-400',
        bgGlow: 'purple',
    },
    {
        icon: GitBranch,
        title: 'GitHub Integration',
        description: 'Push generated code directly to your repo. Branches, PRs, and CI/CD pipelines — all built in.',
        color: 'from-primary/20 to-blue-500/20',
        iconColor: 'text-blue-400',
        bgGlow: 'blue',
    },
    {
        icon: Rocket,
        title: 'Deploy Instantly',
        description: 'One-click deployment to Vercel, Netlify, or your own infrastructure. Ship faster than ever.',
        color: 'from-accent/20 to-pink-500/20',
        iconColor: 'text-pink-400',
        bgGlow: 'pink',
    },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set((e.clientX - centerX) / rect.width);
        mouseY.set((e.clientY - centerY) / rect.height);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            className="group relative"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
        >
            {/* Glow effect */}
            <motion.div
                className={`absolute -inset-1 bg-gradient-to-r ${feature.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}
            />

            {/* Card */}
            <div className="relative glass-strong rounded-2xl p-8 border border-border/40 group-hover:border-primary/40 transition-all duration-500 overflow-hidden">
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Animated particles on hover */}
                <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            className={`absolute w-1 h-1 rounded-full ${feature.iconColor.replace('text', 'bg')}`}
                            style={{
                                top: `${20 + i * 30}%`,
                                left: `${10 + i * 30}%`,
                            }}
                            animate={{
                                y: [-20, -40, -20],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2 + i * 0.5,
                                delay: i * 0.3,
                            }}
                        />
                    ))}
                </div>

                <div className="relative" style={{ transform: 'translateZ(50px)' }}>
                    {/* Icon */}
                    <motion.div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-6 relative overflow-hidden`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                        <feature.icon className={`h-7 w-7 ${feature.iconColor} relative z-10`} />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                        {feature.description}
                    </p>

                    {/* Decorative line */}
                    <motion.div
                        className={`mt-6 h-1 rounded-full bg-gradient-to-r ${feature.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export function Features() {
    return (
        <section id="features" className="relative py-32 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 8,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 8,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            <div className="container relative z-10 max-w-7xl">
                {/* Header */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-sm font-medium mb-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Why RyzeCanvas</span>
                    </motion.div>

                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
                        Enterprise-Grade.{' '}
                        <span className="gradient-text">Developer-First.</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Built for teams that ship fast and demand reliability. Every feature designed for production.
                    </p>
                </motion.div>

                {/* Features grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ perspective: '1000px' }}>
                    {features.map((feature, index) => (
                        <FeatureCard key={feature.title} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
