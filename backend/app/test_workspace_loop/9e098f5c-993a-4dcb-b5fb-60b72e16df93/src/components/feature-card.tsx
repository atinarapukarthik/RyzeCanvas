import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

type FeatureCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

export const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <article
      className={cn(
        'flex flex-col items-center text-center p-6',
        'bg-[var(--color-bg-dark)] rounded-lg',
        'shadow-sm hover:shadow-md transition',
      )}
    >
      <Icon className={cn('h-12 w-12 mb-4 text-[var(--color-primary)]')} aria-hidden="true" />
      <h3 className={cn('font-heading text-xl mb-2')}>{title}</h3>
      <p className={cn('font-body text-base')}>{description}</p>
    </article>
  );
};