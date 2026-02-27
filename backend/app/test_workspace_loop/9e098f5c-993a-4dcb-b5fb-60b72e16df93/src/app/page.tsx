import { HeroSection } from '@/components/hero-section';
import { CTASection } from '@/components/cta-section';
import { FeatureCard } from '@/components/feature-card';
import { cn } from '@/lib/utils';
import { Star, Zap, Shield } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Star,
      title: 'Beautiful Design',
      description: 'Modern UI built with Tailwind CSS and custom design tokens.',
    },
    {
      icon: Zap,
      title: 'Fast Performance',
      description: 'Optimized for speed with Next.js 15 server components.',
    },
    {
      icon: Shield,
      title: 'Secure',
      description: 'Built‑in security best practices and TypeScript safety.',
    },
  ];

  return (
    <main
      className={cn(
        'flex flex-col min-h-screen',
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
      )}
    >
      <HeroSection />
      <section
        id="features"
        className={cn(
          'py-20 px-4 md:px-8',
          'bg-[var(--color-surface)] text-[var(--color-bg-dark)]',
          'grid grid-cols-1 md:grid-cols-3 gap-8',
        )}
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className={cn('sr-only')}>
          Features
        </h2>
        {features.map((f, i) => (
          <FeatureCard
            key={i}
            icon={f.icon}
            title={f.title}
            description={f.description}
          />
        ))}
      </section>
      <CTASection />
    </main>
  );
}