import type { FC, ReactNode } from 'react';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lucide icons are React components that render SVGs. The library does not provide
// a dedicated `Icon` type, so we define a compatible type locally. This matches the
// signature of any exported Lucide icon component.
type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Feature = {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Short title of the feature */
  title: string;
  /** Description text */
  description: string;
};

/**
 * A responsive grid that showcases product features.
 *
 * The component is a Server Component (no `'use client'` needed) because it
 * contains only static markup and does not use browser‑only APIs.
 *
 * Accessibility:
 * - Wrapped in a `<section>` with `aria-labelledby` pointing to the heading.
 * - Each feature uses a `<h3>` for the title and a `<p>` for the description.
 * - Icons are marked with `aria-hidden="true"` as they are decorative.
 */
export const Features: FC = () => {
  const featureList: Feature[] = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Experience blazing‑fast performance with our optimized architecture.',
    },
    {
      icon: Shield,
      title: 'Secure',
      description: 'Built‑in security features keep your data safe and private.',
    },
    {
      icon: CheckCircle,
      title: 'Reliability',
      description: '99.9% uptime guarantee ensures your service is always available.',
    },
    {
      icon: ArrowRight,
      title: 'Intuitive',
      description: 'A clean, user‑friendly interface that requires no training.',
    },
  ];

  return (
    <section aria-labelledby="features-heading" className={cn('py-12', 'bg-[var(--color-bg-dark)]')}>
      <div className="container mx-auto px-4">
        <h2
          id="features-heading"
          className={cn(
            'text-3xl font-bold text-center mb-8',
            'text-[var(--color-primary)]',
            'font-[var(--font-heading)]'
          )}
        >
          Product Features
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featureList.map((feature) => (
            <article
              key={feature.title}
              className={cn(
                'flex items-start gap-4 p-6 rounded-lg',
                'bg-[var(--color-surface)]',
                'shadow-sm hover:shadow-md transition-shadow duration-200'
              )}
            >
              <feature.icon
                aria-hidden="true"
                className={cn('flex-shrink-0 w-8 h-8 text-[var(--color-primary)]')}
              />
              <div>
                <h3
                  className={cn(
                    'text-xl font-semibold mb-2',
                    'text-[var(--color-primary)]',
                    'font-[var(--font-heading)]'
                  )}
                >
                  {feature.title}
                </h3>
                <p className={cn('text-base text-[var(--color-accent)]', 'font-[var(--font-body)]')}>
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;