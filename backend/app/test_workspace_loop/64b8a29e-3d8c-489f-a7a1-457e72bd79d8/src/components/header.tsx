'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  name: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Features', href: '/features' },
  { name: 'Contact', href: '/contact' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  return (
    <header
      className={cn(
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        'border-b border-[var(--color-primary)]'
      )}
    >
      <nav
        className="max-w-7xl mx-auto flex items-center justify-between p-4"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <span className="sr-only">Landing</span>
          <img
            src="/placeholder.svg?height=40&width=120&query=Logo"
            alt="Logo"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop navigation */}
        <ul className="hidden md:flex gap-6">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className={cn(
            'md:hidden flex items-center p-2 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
          )}
          onClick={toggleMobile}
          aria-controls="mobile-menu"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <X className="h-6 w-6 text-[var(--color-surface)]" />
          ) : (
            <Menu className="h-6 w-6 text-[var(--color-surface)]" />
          )}
        </button>
      </nav>

      {/* Mobile navigation panel */}
      <div
        id="mobile-menu"
        className={cn(
          'md:hidden bg-[var(--color-bg-dark)] border-t border-[var(--color-primary)]',
          'overflow-hidden transition-max-height duration-300',
          mobileOpen ? 'max-h-screen' : 'max-h-0'
        )}
      >
        <ul className="flex flex-col gap-4 p-4">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block text-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

export default Header;