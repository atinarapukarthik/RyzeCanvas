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
  { name: 'Contact', href: '/contact' },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className={cn(
        'w-full',
        'bg-[var(--color-bg-dark)]',
        'text-[var(--color-surface)]',
        'border-b',
        'border-[var(--color-primary)]',
        'shadow-sm'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/placeholder.svg?height=40&width=120&query=Logo"
            alt="Site Logo"
            width={120}
            height={40}
            className="object-contain"
          />
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            MySite
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors',
                'hover:text-[var(--color-primary)]',
                'focus-visible:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-[var(--color-primary)]',
                'rounded'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className={cn(
            'md:hidden',
            'p-2',
            'rounded',
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-[var(--color-primary)]',
            'text-[var(--color-surface)]'
          )}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      {isOpen && (
        <nav className="md:hidden border-t border-[var(--color-primary)] bg-[var(--color-bg-dark)]">
          <ul className="flex flex-col gap-2 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block w-full',
                    'transition-colors',
                    'hover:text-[var(--color-primary)]',
                    'focus-visible:outline-none',
                    'focus-visible:ring-2',
                    'focus-visible:ring-[var(--color-primary)]',
                    'rounded'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}