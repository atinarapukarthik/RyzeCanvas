import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type FooterProps = {
  /** Additional class names for the root element */
  className?: string;
  /** Optional custom navigation items */
  navItems?: { href: string; label: string }[];
  /** Optional custom copyright text */
  copyright?: ReactNode;
};

export default function Footer({
  className,
  navItems,
  copyright,
}: FooterProps) {
  const defaultNav = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/contact', label: 'Contact' },
  ];

  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'w-full bg-[var(--color-bg-dark)] text-[var(--color-surface)] py-6',
        'flex flex-col items-center gap-4 md:flex-row md:justify-between md:items-center',
        className,
      )}
      aria-label="Site footer"
    >
      {/* Navigation Links */}
      <nav aria-label="Footer navigation">
        <ul className="flex flex-wrap justify-center gap-4 md:justify-start">
          {(navItems ?? defaultNav).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Copyright */}
      <div className="text-xs text-center md:text-right">
        {copyright ?? (
          <span>
            © {year} My Company. All rights reserved.
          </span>
        )}
      </div>
    </footer>
  );
}