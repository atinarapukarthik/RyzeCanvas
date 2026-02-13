"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export interface HeroProps {
    badge?: string;
    title: string;
    highlightedWord?: string;
    description: string;
    primaryCtaText?: string;
    primaryCtaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
}

export function HeroSection({
    badge = "v2.0 is now live",
    title = "Build Stunning UI in",
    highlightedWord = "Seconds",
    description = "Describe your interface, and RyzeCanvas generates production-ready React code styled with Tailwind CSS. No more boilerplate.",
    primaryCtaText = "Start Building Free",
    primaryCtaLink = "/studio",
    secondaryCtaText = "Star on GitHub",
    secondaryCtaLink = "https://github.com/atinarapukarthik/RyzeCanvas"
}: HeroProps) {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[url('/grid-pattern.svg')] opacity-20" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full -z-10" />

            <div className="container px-4 md:px-6 text-center">
                {badge && (
                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-fade-in-up">
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                        {badge}
                    </div>
                )}

                <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 animate-fade-in-up delay-100">
                    {title} <br className="hidden md:block" /> <span className="text-primary">{highlightedWord}</span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in-up delay-200">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                    <Link href={primaryCtaLink}>
                        <Button size="lg" className="h-12 px-8 text-base bg-white text-black hover:bg-gray-100 dark:bg-primary dark:text-white dark:hover:bg-primary/90">
                            {primaryCtaText}
                        </Button>
                    </Link>
                    <Link href={secondaryCtaLink} target="_blank">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2">
                            <Github className="h-5 w-5" /> {secondaryCtaText}
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
