import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)] py-6',
        'flex items-center justify-center'
      )}
      role="contentinfo"
    >
      <div className="container mx-auto flex flex-col items-center gap-4 text-sm">
        <p className="text-center">
          &copy; {currentYear} My Company. All rights reserved.
        </p>

        <nav
          aria-label="External links"
          className={cn('flex flex-wrap items-center justify-center gap-4')}
        >
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 transition-colors',
              'hover:text-[var(--color-primary)]'
            )}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>

          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 transition-colors',
              'hover:text-[var(--color-primary)]'
            )}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Twitter
          </a>

          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 transition-colors',
              'hover:text-[var(--color-primary)]'
            )}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}