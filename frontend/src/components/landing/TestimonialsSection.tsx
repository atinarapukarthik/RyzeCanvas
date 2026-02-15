"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Image from "next/image";
import { AvatarCircles } from "@/components/ui/avatar-circles";

const testimonials = [
    {
        name: "Sarah Chen",
        role: "Senior Frontend Engineer",
        company: "Vercel",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        content:
            "RyzeCanvas has completely transformed how I prototype. What used to take hours now takes minutes. The generated code is production-ready and follows best practices.",
        rating: 5,
    },
    {
        name: "Marcus Johnson",
        role: "Tech Lead",
        company: "Stripe",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
        content:
            "The RAG-powered component suggestion is incredible. It understands context and generates exactly what I need. My team's velocity has increased by 3x.",
        rating: 5,
    },
    {
        name: "Elena Rodriguez",
        role: "Product Designer",
        company: "Linear",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
        content:
            "As a designer who codes, RyzeCanvas bridges the gap perfectly. I can quickly iterate on designs and ship functional components without breaking a sweat.",
        rating: 5,
    },
    {
        name: "David Park",
        role: "Indie Hacker",
        company: "@davidbuilds",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        content:
            "I shipped my SaaS MVP in 2 weeks thanks to RyzeCanvas. The quality of generated code is exceptional — clean, typed, and accessible. Game changer for solo founders.",
        rating: 5,
    },
    {
        name: "Priya Sharma",
        role: "Engineering Manager",
        company: "Notion",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
        content:
            "We integrated RyzeCanvas into our design system workflow. The consistency and speed improvements are remarkable. Our designers and engineers collaborate seamlessly now.",
        rating: 5,
    },
    {
        name: "Alex Thompson",
        role: "Full Stack Developer",
        company: "Supabase",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        content:
            "The best AI code generator I've used. Unlike others that give you placeholder junk, RyzeCanvas generates real, working components with proper state management.",
        rating: 5,
    },
];

function TestimonialCard({
    testimonial,
    index,
}: {
    testimonial: (typeof testimonials)[0];
    index: number;
}) {
    return (
        <motion.div
            className="relative flex flex-col rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm transition-all duration-500 hover:border-border/80 hover:bg-card/60 hover:shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {/* Quote icon */}
            <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                <Quote className="h-4 w-4 text-primary" />
            </div>

            {/* Rating */}
            <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                        key={i}
                        className="h-4 w-4 text-amber-400"
                        fill="currentColor"
                        strokeWidth={0}
                    />
                ))}
            </div>

            {/* Content */}
            <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">
                &quot;{testimonial.content}&quot;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-border">
                    <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        unoptimized
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {testimonial.role} · {testimonial.company}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export function TestimonialsSection() {
    return (
        <section id="testimonials" className="relative py-32 overflow-hidden bg-muted/20">
            {/* Background effects */}
            <div className="absolute inset-0 bg-grid-white pointer-events-none opacity-[0.02] dark:opacity-20" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
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
                        <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                        Testimonials
                    </motion.div>

                    <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
                        Loved by{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            50,000+ developers
                        </span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                        See what developers, designers, and teams are saying about RyzeCanvas.
                    </p>
                </motion.div>

                {/* Testimonials grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard
                            key={testimonial.name}
                            testimonial={testimonial}
                            index={index}
                        />
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    className="mt-16 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                >
                    <p className="text-sm text-muted-foreground mb-6">
                        Join thousands of developers shipping faster
                    </p>
                    <AvatarCircles
                        avatarUrls={testimonials.slice(0, 4).map(t => t.avatar)}
                        numPeople={50000}
                        className="justify-center"
                    />
                </motion.div>
            </div>
        </section>
    );
}
