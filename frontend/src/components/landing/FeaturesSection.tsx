"use client";

import { ReactNode } from "react";
import { Code2, LayoutTemplate, Github, Zap, Shield, Sparkles } from "lucide-react";

export interface Feature {
    icon: string; // We'll use string keys to map to icons for JSON compatibility
    title: string;
    description: string;
}

const ICON_MAP: Record<string, ReactNode> = {
    code: <Code2 className="h-8 w-8 text-blue-500" />,
    layout: <LayoutTemplate className="h-8 w-8 text-purple-500" />,
    github: <Github className="h-8 w-8 text-gray-400" />,
    zap: <Zap className="h-8 w-8 text-yellow-500" />,
    shield: <Shield className="h-8 w-8 text-green-500" />,
    sparkles: <Sparkles className="h-8 w-8 text-pink-500" />,
};

export interface FeaturesProps {
    title: string;
    description: string;
    features: Feature[];
}

export function FeaturesSection({
    title = "Everything you need to ship faster",
    description = "RyzeCanvas combines the power of LLMs with modern web standards to accelerate your workflow.",
    features = [
        { icon: "code", title: "Clean React Code", description: "Get readable, maintainable code using best practices. Fully typed with TypeScript." },
        { icon: "layout", title: "Modern UI Components", description: "Styled with Tailwind CSS and Shadcn/UI for a premium, consistent look." },
        { icon: "github", title: "GitHub Integration", description: "Push your generated components directly to your repositories with one click." }
    ]
}: FeaturesProps) {
    return (
        <section id="features" className="py-24 bg-secondary/30">
            <div className="container px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">{title}</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {description}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl border bg-background p-8 hover:border-primary/50 transition-colors">
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-secondary p-3 group-hover:bg-primary/10 transition-colors">
                                {ICON_MAP[feature.icon] || <Zap className="h-8 w-8" />}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
