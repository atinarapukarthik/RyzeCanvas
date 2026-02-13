"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      <LandingNav />

      <main className="flex-1">
        <HeroSection
          title="Build Stunning UI in"
          highlightedWord="Seconds"
          description="Describe your interface, and RyzeCanvas generates production-ready React code styled with Tailwind CSS. No more boilerplate."
        />

        <FeaturesSection
          title="Everything you need to ship faster"
          description="RyzeCanvas combines the power of LLMs with modern web standards to accelerate your workflow."
          features={[
            { icon: "code", title: "Clean React Code", description: "Get readable, maintainable code using best practices. Fully typed with TypeScript." },
            { icon: "layout", title: "Modern UI Components", description: "Styled with Tailwind CSS and Shadcn/UI for a premium, consistent look." },
            { icon: "github", title: "GitHub Integration", description: "Push your generated components directly to your repositories with one click." }
          ]}
        />

        <CTASection
          title="Ready to revolutionize your workflow?"
          ctaText="Open Studio Now"
          ctaLink="/studio"
        />
      </main>

      <Footer />
    </div>
  );
}
