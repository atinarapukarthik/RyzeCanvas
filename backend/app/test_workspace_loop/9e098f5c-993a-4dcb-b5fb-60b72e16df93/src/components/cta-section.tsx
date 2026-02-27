import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export const CTASection = () => {
  return (
    <section
      id="cta"
      className={cn(
        'flex flex-col items-center justify-center py-20 px-4 md:px-8',
        'bg-[var(--color-accent)] text-[var(--color-bg-dark)]',
      )}
      aria-label="Call to action"
    >
      <h2 className={cn('font-heading text-3xl md:text-4xl mb-4 text-center')}>
        Ready to launch your project?
      </h2>
      <p className={cn('font-body text-lg mb-8 text-center max-w-xl')}>
        Join thousands of developers who trust our starter kit to deliver stunning
        landing pages in minutes.
      </p>
      <Link
        href="/signup"
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-8 py-3',
          'bg-[var(--color-primary)] text-[var(--color-bg-dark)]',
          'hover:bg-[var(--color-primary)]/90 transition',
        )}
      >
        Create Your Account
        <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
};