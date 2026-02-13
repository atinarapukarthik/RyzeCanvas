"use client";

import Link from "next/link";
import { ArrowRight, Code2, Github, LayoutTemplate, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <Zap className="h-6 w-6 text-primary" />
            <span>RyzeCanvas</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#showcase" className="hover:text-foreground transition-colors">Showcase</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/studio">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[url('/grid-pattern.svg')] opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full -z-10" />

          <div className="container px-4 md:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              v2.0 is now live
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 animate-fade-in-up delay-100">
              Build Stunning UI <br /> in <span className="text-primary">Seconds</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in-up delay-200">
              Describe your interface, and RyzeCanvas generates production-ready React code styled with Tailwind CSS. No more boilerplate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
              <Link href="/studio">
                <Button size="lg" className="h-12 px-8 text-base bg-white text-black hover:bg-gray-100 dark:bg-primary dark:text-white dark:hover:bg-primary/90">
                  Start Building Free
                </Button>
              </Link>
              <Link href="https://github.com/atinarapukarthik/RyzeCanvas" target="_blank">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2">
                  <Github className="h-5 w-5" /> Star on GitHub
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to ship faster</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                RyzeCanvas combines the power of LLMs with modern web standards to accelerate your workflow.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Code2 className="h-8 w-8 text-blue-500" />,
                  title: "Clean React Code",
                  desc: "Get readable, maintainable code using best practices. Fully typed with TypeScript."
                },
                {
                  icon: <LayoutTemplate className="h-8 w-8 text-purple-500" />,
                  title: "Modern UI Components",
                  desc: "Styled with Tailwind CSS and Shadcn/UI for a premium, consistent look."
                },
                {
                  icon: <Github className="h-8 w-8 text-gray-400" />,
                  title: "GitHub Integration",
                  desc: "Push your generated components directly to your repositories with one click."
                }
              ].map((feature, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl border bg-background p-8 hover:border-primary/50 transition-colors">
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-secondary p-3 group-hover:bg-primary/10 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Access CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Ready to revolutionize your workflow?</h2>
            <Link href="/studio">
              <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-foreground text-background hover:bg-foreground/90">
                Open Studio Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Zap className="h-5 w-5 text-primary" />
            <span>RyzeCanvas</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 RyzeCanvas. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Twitter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
