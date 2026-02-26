import type { FC } from 'react';
import type { Icon as LucideIcon } from 'lucide-react';
import { Star, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type Feature = {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Short title of the feature */
  title: string;
  /** Description text */
  description: string;
};

const defaultFeatures: Feature[] = [
  {
    icon: Star,
    title: 'Outstanding Quality',
    description:
      'Our product is built with the highest standards to ensure reliability and performance.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Experience blazing‑fast speeds thanks to cutting‑edge technology and optimization.',
  },
  {
    icon: Shield,
    title: 'Secure & Trusted',
    description:
      'Security is at the core of everything we do, keeping your data safe and private.',
  },
];

export const FeaturesSection: FC<{ features?: Feature[] }> = ({
  features = defaultFeatures,
}) => {
  return (
    <section
      aria-labelledby="features-heading"
      className={cn(
        'py-12',
        'bg-[var(--color-bg-dark)]',
        'text-[var(--color-body)]',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="features-heading"
          className={cn('text-3xl font-bold text-center mb-12')}
          style={{ color: 'var(--color-primary)' }}
        >
          Features
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className={cn(
                  'flex flex-col items-center text-center',
                  'p-6',
                  'bg-[var(--color-surface)]',
                  'rounded-lg',
                  'shadow-sm',
                )}
              >
                <Icon
                  className={cn('h-12 w-12 mb-4')}
                  style={{ color: 'var(--color-accent)' }}
                />
                <h3
                  className={cn('text-xl font-semibold mb-2')}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {feature.title}
                </h3>
                <p className={cn('text-base')} style={{ color: 'var(--color-surface)' }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;