'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeroProps = {
  /** Optional headline text */
  title?: string;
  /** Optional sub‑headline text */
  subtitle?: string;
  /** Optional call‑to‑action label */
  ctaLabel?: string;
  /** Optional URL for the CTA button */
  ctaHref?: string;
  /** Optional background image URL */
  backgroundUrl?: string;
};

/**
 * Hero section component – a client component because it uses the `Button`
 * client component.
 *
 * Uses CSS variables defined in `globals.css` for colors and typography.
 * Tailwind v4 utilities are applied via the `cn` helper.
 */
export default function Hero({
  title = 'Welcome to Our Product',
  subtitle = 'Build, ship, and scale faster with our all‑in‑one platform.',
  ctaLabel = 'Get Started',
  ctaHref = '#',
  backgroundUrl = '/placeholder.svg?height=800&width=1600&text=Hero%20Background',
}: HeroProps) {
  return (
    <section
      aria-label="hero"
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        'bg-[var(--color-bg-dark)]',
        'text-white'
      )}
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div className="relative z-10 max-w-5xl px-4 py-20 text-center lg:py-32">
        <h1
          className="mb-6 text-5xl font-bold leading-tight lg:text-6xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>

        <p
          className="mb-10 text-lg text-gray-200 lg:text-xl"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {subtitle}
        </p>

        <Button
          asChild
          className={cn(
            'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90',
            'text-white',
            'px-6 py-3',
            'rounded-md',
            'inline-flex items-center gap-2'
          )}
        >
          <a href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </section>
  );
}