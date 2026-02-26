import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        'border-t border-[var(--color-primary)]',
        'py-8'
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Navigation Links */}
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-6">
          <ul className="flex flex-wrap gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'text-sm font-medium',
                    'hover:underline',
                    'transition-colors duration-200',
                    'text-[var(--color-surface)] hover:text-[var(--color-primary)]'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <hr className="my-6 border-[var(--color-primary)] opacity-30" />

        {/* Copyright & Attribution */}
        <div className="flex flex-col items-center gap-2 text-sm md:flex-row md:justify-between">
          <p className="text-[var(--color-surface)]">
            © {currentYear} Your Company. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-[var(--color-surface)]">
            Made with
            <Heart className="w-4 h-4 text-[var(--color-accent)]" />
            by Your Team
          </p>
        </div>
      </div>
    </footer>
  );
}