import { Shield, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: <Star className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />,
    title: 'Performance',
    description: 'Lightning‑fast builds and deployments with zero‑config optimizations.',
  },
  {
    icon: <Shield className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />,
    title: 'Security',
    description: 'Built‑in security scanning and automated compliance checks.',
  },
  {
    icon: <Zap className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />,
    title: 'Scalability',
    description: 'Scale effortlessly from prototypes to enterprise‑grade applications.',
  },
];

export function Features() {
  return (
    <section
      className={cn(
        'py-16 bg-[var(--color-bg-dark)] text-white',
        'gap-12',
        'flex flex-col items-center'
      )}
      aria-labelledby="features-title"
    >
      <h2
        id="features-title"
        className={cn(
          'text-3xl font-bold',
          'font-[var(--font-heading)]',
          'text-center'
        )}
      >
        Features
      </h2>

      <ul className={cn('grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3')}>
        {features.map((feature, idx) => (
          <li
            key={idx}
            className={cn(
              'flex flex-col items-center text-center gap-4',
              'p-6 bg-[var(--color-surface)] rounded-lg'
            )}
          >
            {feature.icon}
            <h3 className={cn('text-xl font-semibold', 'font-[var(--font-heading)]')}>
              {feature.title}
            </h3>
            <p className={cn('text-sm', 'font-[var(--font-body)]')}>{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}