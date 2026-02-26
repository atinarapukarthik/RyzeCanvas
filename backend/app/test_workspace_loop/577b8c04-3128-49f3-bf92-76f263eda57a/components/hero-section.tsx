import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hero Section – Server Component
 *
 * Features:
 * - Headline (Inter font)
 * - Sub‑text (Roboto font)
 * - Primary CTA button with Lucide icon
 * - Full‑width background image (placeholder)
 * - Dark‑mode support using only the allowed palette:
 *   • Light:   bg-white / text-white / gray‑200 / gray‑300
 *   • Dark:    bg-gray-900 / text-gray-100 / gray‑200 / gray‑300
 *
 * Accessibility:
 * - Semantic <section> with `aria-labelledby`
 * - Button is a native <a> element with `role="button"`
 * - Focus-visible outline for keyboard users
 */
export default async function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className={cn(
        "relative flex flex-col items-center justify-center text-center",
        "bg-cover bg-center bg-no-repeat",
        "p-8 md:p-16 lg:p-24",
        // Light background is white; dark mode uses gray‑900.
        "bg-white dark:bg-gray-900",
        // Text colour for the container (overridden on children as needed)
        "text-white dark:text-gray-100"
      )}
      style={{
        backgroundImage:
          "url('/placeholder.svg?height=800&width=1600&query=hero')",
      }}
    >
      {/* Overlay to darken the image for better text contrast */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl">
        {/* Headline – Inter font */}
        <h1
          id="hero-heading"
          className={cn(
            "text-4xl font-bold md:text-5xl lg:text-6xl",
            "tracking-tight",
            "font-inter"
          )}
        >
          Elevate Your Experience
        </h1>

        {/* Sub‑text – Roboto font */}
        <p className={cn(
          "mt-4 text-lg md:text-xl",
          "text-gray-200 dark:text-gray-300",
          "font-roboto"
        )}>
          Discover the next generation of tools designed to empower creators and innovators.
        </p>

        {/* CTA */}
        <a
          href="#get-started"
          role="button"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md",
            // Accent colour – using the allowed palette (white on dark, black on light)
            "bg-black hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            "dark:bg-white dark:hover:bg-gray-200 dark:focus-visible:outline-gray-900",
            "px-6 py-3 mt-8 text-base font-medium text-white dark:text-black",
            "transition-colors"
          )}
        >
          Get Started
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}