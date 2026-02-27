import type { FC, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeroSectionProps {
  /** Main headline text */
  title: string;
  /** Supporting sub‑text */
  subtitle?: string;
  /** URL of the background image */
  backgroundImage: string;
  /** Primary call‑to‑action label */
  ctaLabel: string;
  /** URL the CTA should navigate to */
  ctaHref: string;
  /** Optional icon to display inside the CTA (defaults to ArrowRight) */
  ctaIcon?: ReactNode;
  /** Optional additional class names for the root element */
  className?: string;
}

/**
 * Reusable Hero Section component.
 *
 * - Server component by default (no client‑side interactivity required).
 * - Uses CSS variables from `globals.css` for theming.
 * - Tailwind v4 utilities for layout & spacing.
 * - Accessible markup with proper landmarks and ARIA.
 */
export const HeroSection: FC<HeroSectionProps> = ({
  title,
  subtitle,
  backgroundImage,
  ctaLabel,
  ctaHref,
  ctaIcon,
  className,
}) => {
  const backgroundStyle = {
    backgroundImage: `url(${backgroundImage})`,
  };

  return (
    <section
      aria-label="hero"
      className={cn(
        'relative flex min-h-[60vh] items-center justify-center bg-cover bg-center text-center',
        className,
      )}
      style={backgroundStyle}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1
          className={cn(
            'text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl',
            'text-white',
            'font-heading',
          )}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className={cn(
              'mt-6 text-lg leading-8 text-gray-200',
              'font-body',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {subtitle}
          </p>
        )}

        <div className="mt-10 flex justify-center">
          <a
            href={ctaHref}
            className={cn(
              'inline-flex items-center rounded-md bg-primary px-6 py-3 text-base font-medium',
              'text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
            }}
          >
            <span>{ctaLabel}</span>
            {ctaIcon ?? (
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            )}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;