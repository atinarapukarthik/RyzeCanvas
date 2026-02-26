'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen((prev) => !prev);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-[var(--color-surface)] bg-[var(--color-bg-dark)]',
        'backdrop-blur-sm'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Home">
          <img
            src="/placeholder.svg?height=40&width=120&text=Logo"
            alt="Site Logo"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors',
                'text-[var(--color-surface)] hover:text-[var(--color-primary)]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center rounded-md p-2 text-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label="Toggle menu"
          aria-controls="mobile-menu"
          aria-expanded={mobileMenuOpen}
          onClick={toggleMenu}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      <nav
        id="mobile-menu"
        className={cn(
          'md:hidden absolute inset-x-0 top-full bg-[var(--color-bg-dark)] border-b border-[var(--color-surface)] transition-max-height duration-300 ease-in-out',
          mobileMenuOpen ? 'max-h-screen py-4' : 'max-h-0 overflow-hidden'
        )}
        aria-label="Mobile Primary"
      >
        <ul className="flex flex-col gap-4 px-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'block text-base font-medium transition-colors',
                  'text-[var(--color-surface)] hover:text-[var(--color-primary)]'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}