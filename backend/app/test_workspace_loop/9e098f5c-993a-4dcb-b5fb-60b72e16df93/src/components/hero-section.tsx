import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'min-h-[60vh] md:min-h-[80vh] px-4 md:px-8',
        'bg-[var(--color-primary)] text-[var(--color-bg-dark)]',
      )}
      aria-label="Hero"
    >
      <h1 className={cn('font-heading text-4xl md:text-6xl mb-4')}>
        Elevate Your Digital Presence
      </h1>
      <p className={cn('font-body text-lg md:text-xl max-w-2xl mb-8')}>
        Craft beautiful, fast, and secure experiences with our cutting‑edge
        landing‑page starter.
      </p>
      <Link
        href="#cta"
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-6 py-3',
          'bg-[var(--color-accent)] text-[var(--color-bg-dark)]',
          'hover:bg-[var(--color-accent)]/90 transition',
        )}
      >
        Get Started
        <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
};