import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Hero section component.
 *
 * Displays a full‑width background image with a headline, supporting text,
 * and a primary call‑to‑action button.
 *
 * The background image is served from the public folder at `/hero-image.jpg`.
 * Tailwind's arbitrary value syntax (`bg-[url(...)]`) is used to set the
 * background image directly on the container.
 *
 * This component is a **Server Component** (no `'use client'` directive) because
 * it contains only static markup and Next.js‑compatible `Link` navigation.
 */
export default function Hero() {
  return (
    <section
      className={cn(
        // Background image with cover and center positioning
        "relative flex items-center justify-center min-h-[70vh] bg-cover bg-center bg-no-repeat",
        "bg-[url('/hero-image.jpg')]",
        // Dark overlay for better text contrast
        "after:absolute after:inset-0 after:bg-black/40"
      )}
      aria-labelledby="hero-heading"
    >
      {/* Content container – positioned above the overlay */}
      <div className="relative z-10 max-w-2xl text-center px-4 py-12">
        <h1
          id="hero-heading"
          className={cn(
            "text-4xl md:text-6xl font-bold tracking-tight",
            "text-[var(--color-primary)]"
          )}
        >
          Transform Your Ideas Into Reality
        </h1>
        <p className="mt-4 text-lg md:text-xl text-[var(--color-surface)]">
          Build modern, performant web experiences with our cutting‑edge tools
          and expert guidance.
        </p>

        <Link href="/get-started" className="inline-block mt-8">
          <Button
            variant="primary"
            className="flex items-center gap-2 px-6 py-3 text-base font-medium"
          >
            Get Started
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  );
}