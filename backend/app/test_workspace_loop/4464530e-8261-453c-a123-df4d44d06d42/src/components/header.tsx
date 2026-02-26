'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);

  return (
    <header
      className={cn(
        'w-full',
        'bg-[var(--color-bg-dark)]',
        'text-[var(--color-surface)]',
        'border-b border-[var(--color-primary)]',
        'sticky top-0 z-50'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/placeholder.svg?height=40&width=40&query=Logo"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            MySite
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-base hover:text-[var(--color-primary)] transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-md hover:bg-[var(--color-primary)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          aria-controls="mobile-menu"
          aria-expanded={mobileOpen}
          onClick={toggleMobileMenu}
        >
          {mobileOpen ? (
            <X className="w-6 h-6 text-[var(--color-surface)]" aria-hidden="true" />
          ) : (
            <Menu className="w-6 h-6 text-[var(--color-surface)]" aria-hidden="true" />
          )}
          <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileOpen && (
        <nav
          id="mobile-menu"
          className={cn(
            'md:hidden',
            'absolute inset-x-0 top-full bg-[var(--color-bg-dark)]',
            'border-t border-[var(--color-primary)]',
            'flex flex-col gap-4 p-4'
          )}
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-base hover:text-[var(--color-primary)] transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
              )}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}