import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeroSectionProps = {
  /** Main headline text */
  title: string;
  /** Supporting sub‑text */
  subtitle?: string;
  /** Text for the primary call‑to‑action button */
  ctaText: string;
  /** URL the CTA button should navigate to */
  ctaHref: string;
  /** URL of the background image (optional – if omitted a solid background is used) */
  backgroundImage?: string;
  /** Additional Tailwind classes for the root element */
  className?: string;
  /** Optional children – useful for adding extra overlay content */
  children?: ReactNode;
};

/**
 * Reusable Hero Section component.
 *
 * - Server component (no client‑side interactivity required).
 * - Uses CSS variables defined in `globals.css` for theming.
 * - Tailwind v4 utilities for layout & spacing.
 * - Lucide `ArrowRight` icon inside the primary CTA.
 */
export default function HeroSection({
  title,
  subtitle,
  ctaText,
  ctaHref,
  backgroundImage,
  className,
  children,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        'relative flex min-h-[60vh] items-center justify-center overflow-hidden p-8 text-center',
        className,
      )}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {
              backgroundColor: 'var(--color-bg-dark)',
            }
      }
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative z-10 flex max-w-3xl flex-col gap-6">
        <h1
          className={cn(
            'text-4xl font-bold leading-tight text-white md:text-6xl',
            'font-[var(--font-heading)]',
          )}
          style={{ color: 'var(--color-primary)' }}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="mx-auto max-w-xl text-lg text-white/90 md:text-xl">
            {subtitle}
          </p>
        )}

        <Link
          href={ctaHref}
          className={cn(
            'inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90',
          )}
        >
          {ctaText}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>

        {/* Render any extra overlay content (e.g., badges) */}
        {children}
      </div>
    </section>
  );
}