"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface CTAProps {
    title: string;
    ctaText: string;
    ctaLink: string;
}

export function CTASection({
    title = "Ready to revolutionize your workflow?",
    ctaText = "Open Studio Now",
    ctaLink = "/studio"
}: CTAProps) {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 -z-10" />
            <div className="container px-4 md:px-6 text-center">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">{title}</h2>
                <Link href={ctaLink}>
                    <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-foreground text-background hover:bg-foreground/90">
                        {ctaText}
                    </Button>
                </Link>
            </div>
        </section>
    );
}
