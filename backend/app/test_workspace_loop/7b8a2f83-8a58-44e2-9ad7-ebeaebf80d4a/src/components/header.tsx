'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Services', href: '/services' },
  { name: 'Contact', href: '/contact' },
] as const;

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={cn(
        'bg-[var(--color-bg-dark)]',
        'text-[var(--color-primary)]',
        'sticky top-0 z-50',
        'border-b border-[var(--color-surface)]'
      )}
    >
      <nav
        className="max-w-7xl mx-auto flex items-center justify-between p-4"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/placeholder.svg?height=40&width=120&query=Logo"
            alt="Company Logo"
            className="h-10 w-auto"
          />
          <span className="sr-only">Home</span>
        </Link>

        {/* Desktop navigation */}
        <ul className="hidden md:flex gap-6 text-base font-medium">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-[var(--color-accent)] transition-colors"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className={cn(
            'md:hidden p-2 rounded-md',
            'hover:bg-[var(--color-surface)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
          )}
          aria-controls="mobile-menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile navigation panel */}
      <div
        id="mobile-menu"
        className={cn(
          'md:hidden bg-[var(--color-bg-dark)] text-[var(--color-primary)]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'block' : 'hidden'
        )}
      >
        <ul className="flex flex-col gap-4 p-4 text-base font-medium">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block hover:text-[var(--color-accent)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}