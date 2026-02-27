import { cn } from '@/lib/utils';
import Link from 'next/link';
import { type FC } from 'react';
import { ArrowRight } from 'lucide-react';

export const Footer: FC = () => {
  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        'border-t border-[var(--color-primary)]',
        'py-8'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-6 md:flex-row md:justify-between md:items-start">
        {/* Site navigation */}
        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-4 text-sm">
            <li>
              <Link
                href="/"
                className={cn(
                  'transition-colors hover:text-[var(--color-primary)]',
                  'flex items-center gap-1'
                )}
              >
                Home <ArrowRight size={14} />
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className={cn(
                  'transition-colors hover:text-[var(--color-primary)]',
                  'flex items-center gap-1'
                )}
              >
                About <ArrowRight size={14} />
              </Link>
            </li>
            <li>
              <Link
                href="/services"
                className={cn(
                  'transition-colors hover:text-[var(--color-primary)]',
                  'flex items-center gap-1'
                )}
              >
                Services <ArrowRight size={14} />
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className={cn(
                  'transition-colors hover:text-[var(--color-primary)]',
                  'flex items-center gap-1'
                )}
              >
                Contact <ArrowRight size={14} />
              </Link>
            </li>
          </ul>
        </nav>

        {/* Copyright */}
        <p className="text-sm text-[var(--color-surface)]">
          © {new Date().getFullYear()} Your Company. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;