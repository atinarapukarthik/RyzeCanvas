import { cn } from '@/lib/utils';
import {
  type Icon as LucideIcon,
  Sparkles,
  ShieldCheck,
  Zap,
  Settings,
  Users,
  CreditCard,
} from 'lucide-react';
import type { FC } from 'react';

type Feature = {
  title: string;
  description: string;
  /** Lucide icon component */
  Icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: 'Fast Performance',
    description: 'Lightning‑quick load times powered by Next.js edge rendering.',
    Icon: Zap,
  },
  {
    title: 'Secure by Design',
    description: 'Built‑in security features keep your data safe.',
    Icon: ShieldCheck,
  },
  {
    title: 'Customizable UI',
    description: 'Easily adapt the look and feel with Tailwind CSS.',
    Icon: Settings,
  },
  {
    title: 'Collaboration',
    description: 'Team‑focused tools that boost productivity.',
    Icon: Users,
  },
  {
    title: 'Smart Payments',
    description: 'Integrated payment handling for seamless checkout.',
    Icon: CreditCard,
  },
  {
    title: 'Creative Spark',
    description: 'Inspire users with beautiful, animated interactions.',
    Icon: Sparkles,
  },
];

/**
 * FeaturesSection – a responsive grid that showcases product features.
 *
 * This component is a **server component** (no `'use client'` directive) because
 * it only renders static UI. It uses Tailwind v4 utilities, CSS variables from
 * `globals.css`, and the `cn` helper for class name composition.
 */
export const FeaturesSection: FC = () => {
  return (
    <section
      aria-labelledby="features-heading"
      className={cn(
        'py-12',
        // Background uses the dark surface variable
        'bg-[var(--color-bg-dark)]',
      )}
    >
      <h2 id="features-heading" className="sr-only">
        Product Features
      </h2>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, description, Icon }) => (
            <div
              key={title}
              className={cn(
                'flex flex-col items-center text-center p-6 rounded-lg shadow-sm',
                // Card background uses the neutral surface variable
                'bg-[var(--color-surface)]',
              )}
            >
              <Icon
                className={cn(
                  'w-12 h-12 mb-4',
                  // Icon colour uses the primary colour variable
                  'text-[var(--color-primary)]',
                )}
                aria-hidden="true"
              />
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {title}
              </h3>
              <p
                className="text-sm text-[var(--color-bg-dark)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;