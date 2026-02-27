import type { FC, ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Feature definition.
 * - `icon`: A Lucide React component (e.g., `import { Star } from 'lucide-react'`).
 * - `title`: Short heading for the feature.
 * - `description`: Brief explanatory text.
 */
export interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

/**
 * Props for the FeaturesSection component.
 * - `features`: Array of feature objects to display.
 * - `title` (optional): Section heading. Defaults to “Features”.
 * - `description` (optional): Sub‑heading/intro text displayed under the main title.
 */
interface FeaturesSectionProps {
  features: Feature[];
  title?: string;
  description?: string;
}

/**
 * A responsive grid showcasing product features.
 *
 * - Server component (no `'use client'` needed).
 * - Uses Tailwind CSS v4 utilities and the `cn` helper for class merging.
 * - Colors are pulled from CSS variables defined in `globals.css`.
 * - Icons are rendered with a default size of 48 px and inherit the primary color.
 * - Accessible markup with `section` and `aria-labelledby`.
 */
export const FeaturesSection: FC<FeaturesSectionProps> = ({
  features,
  title = 'Features',
  description,
}) => {
  return (
    <section
      aria-labelledby="features-heading"
      className={cn(
        'py-12',
        'bg-[var(--color-bg-dark)]' // background dark from design system
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="features-heading"
            className="text-3xl font-bold"
            style={{ color: 'var(--color-primary)' }}
          >
            {title}
          </h2>
          {description && (
            <p
              className="mt-4 text-lg"
              style={{ color: 'var(--color-surface)' }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Features grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                'flex flex-col items-center text-center p-6',
                'bg-[var(--color-surface)] rounded-lg shadow-sm'
              )}
            >
              {/* Icon */}
              <div
                className="mb-4"
                style={{ color: 'var(--color-primary)' }}
              >
                <feature.icon size={48} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>

              {/* Description */}
              <p
                className="text-base"
                style={{ color: 'var(--color-bg-dark)' }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;