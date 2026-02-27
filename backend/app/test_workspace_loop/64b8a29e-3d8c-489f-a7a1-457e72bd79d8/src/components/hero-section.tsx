import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HeroSection() {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center min-h-screen px-4 text-center',
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]'
      )}
    >
      {/* Headline */}
      <h1
        className={cn(
          'text-5xl font-bold mb-6',
          'text-[var(--color-primary)]',
          'font-heading'
        )}
      >
        Your Catchy Headline
      </h1>

      {/* Sub‑text */}
      <p className={cn('text-lg mb-8 max-w-2xl', 'font-body')}>
        Supporting subtext that explains the value proposition and invites users to
        explore further.
      </p>

      {/* Call‑to‑Action Button */}
      <a
        href="/get-started"
        className={cn(
          'inline-flex items-center gap-2 px-6 py-3 rounded-md',
          'bg-[var(--color-accent)] text-white',
          'hover:bg-[var(--color-primary)] transition-colors duration-200'
        )}
      >
        Get Started
        <ArrowRight size={20} />
      </a>
    </section>
  );
}