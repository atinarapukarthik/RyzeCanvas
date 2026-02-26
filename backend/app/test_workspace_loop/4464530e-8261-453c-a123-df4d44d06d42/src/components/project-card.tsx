import type { FC, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface ProjectCardProps {
  /** URL of the project image */
  imageUrl: string;
  /** Alt text for the image (required for accessibility) */
  imageAlt: string;
  /** Project title */
  title: string;
  /** Short description of the project */
  description: string;
  /** Optional additional content (e.g., tags, actions) */
  children?: ReactNode;
  /** Additional Tailwind classes for the root element */
  className?: string;
}

/**
 * Reusable card component for displaying a portfolio project.
 *
 * This component is a **Server Component** (no `'use client'` directive) because it
 * only renders static content and does not rely on browser‑only APIs.
 *
 * Accessibility:
 * - Uses semantic `<article>` with `role="article"`.
 * - Image includes required `alt` attribute.
 * - Title is rendered as an `<h3>` to preserve heading hierarchy.
 */
export const ProjectCard: FC<ProjectCardProps> = ({
  imageUrl,
  imageAlt,
  title,
  description,
  children,
  className,
}) => {
  return (
    <article
      role="article"
      className={cn(
        'flex flex-col rounded-lg overflow-hidden shadow-lg bg-[var(--color-surface)]',
        'transition-transform hover:scale-[1.02] hover:shadow-xl',
        className,
      )}
    >
      {/* Image */}
      <div className="relative w-full aspect-[16/9] bg-[var(--color-bg-dark)]">
        {/* Next.js Image optimises the asset; layout is fill to cover the container */}
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover"
          priority={false}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-[var(--color-primary)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-bg-dark)]">{description}</p>

        {/* Slot for optional extra UI (e.g., tags, buttons) */}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </article>
  );
};

export default ProjectCard;