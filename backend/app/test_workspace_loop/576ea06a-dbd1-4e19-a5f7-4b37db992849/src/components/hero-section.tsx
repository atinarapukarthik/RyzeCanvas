import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section
      className={cn(
        // Background & text colors using CSS variables
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        // Layout
        'flex flex-col items-center justify-center gap-6 py-20 text-center',
      )}
    >
      {/* Headline */}
      <h1
        className={cn(
          'text-5xl md:text-6xl font-bold',
          'text-[var(--color-primary)]',
          'font-[var(--font-heading)]',
        )}
      >
        Empower Your Workflow
      </h1>

      {/* Supporting text */}
      <p
        className={cn(
          'max-w-2xl text-lg md:text-xl',
          'font-[var(--font-body)]',
          'text-[var(--color-surface)]',
        )}
      >
        Streamline tasks, collaborate seamlessly, and achieve more with our all‑in‑one platform.
      </p>

      {/* Primary CTA */}
      <Link href="/get-started" passHref>
        <Button
          className={cn(
            'bg-[var(--color-primary)] hover:bg-[var(--color-accent)]',
            'text-white',
            'px-8 py-3',
            'flex items-center gap-2',
          )}
        >
          Get Started
          <ArrowRight size={20} aria-hidden="true" />
        </Button>
      </Link>
    </section>
  );
}