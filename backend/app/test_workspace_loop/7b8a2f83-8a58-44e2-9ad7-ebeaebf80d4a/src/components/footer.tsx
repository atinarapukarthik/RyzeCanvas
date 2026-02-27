import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Github,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
};

type SocialItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const socialItems: SocialItem[] = [
  {
    href: 'https://twitter.com',
    label: 'Twitter',
    Icon: Twitter,
  },
  {
    href: 'https://facebook.com',
    label: 'Facebook',
    Icon: Facebook,
  },
  {
    href: 'https://instagram.com',
    label: 'Instagram',
    Icon: Instagram,
  },
  {
    href: 'https://linkedin.com',
    label: 'LinkedIn',
    Icon: Linkedin,
  },
  {
    href: 'https://github.com',
    label: 'GitHub',
    Icon: Github,
  },
];

export default function Footer() {
  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        'py-8',
        'px-4',
        'mt-auto',
      )}
    >
      <div className="container mx-auto flex flex-col items-center gap-8 md:flex-row md:justify-between">
        {/* Navigation Links */}
        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-4 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--color-primary)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Social Icons */}
        <div className="flex gap-4">
          {socialItems.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={cn(
                'text-[var(--color-surface)]',
                'transition-colors hover:text-[var(--color-primary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
              )}
            >
              <Icon size={20} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <p className="mt-6 text-center text-xs text-[var(--color-surface)]/70">
        © {new Date().getFullYear()} Your Company. All rights reserved.
      </p>
    </footer>
  );
}