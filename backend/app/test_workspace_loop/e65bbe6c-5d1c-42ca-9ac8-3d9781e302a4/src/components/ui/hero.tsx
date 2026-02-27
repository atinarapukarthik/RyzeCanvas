import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Hero() {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center text-center py-20',
        'bg-[var(--color-primary)] text-white',
        'gap-6'
      )}
      aria-labelledby="hero-title"
    >
      <h1
        id="hero-title"
        className={cn(
          'text-5xl font-bold',
          'font-[var(--font-heading)]',
          'tracking-tight'
        )}
      >
        Build Faster, Ship Smarter
      </h1>
      <p className={cn('text-lg', 'font-[var(--font-body)]', 'max-w-2xl')}>
        Our platform empowers developers with tools that accelerate development,
        improve collaboration, and deliver high‑quality software.
      </p>
      <Link
        href="#"
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-6 py-3',
          'bg-[var(--color-accent)] text-black',
          'hover:bg-[var(--color-accent)]/90 transition-colors',
          'font-medium'
        )}
      >
        Get Started
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}