import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

export default function Header() {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-6 py-4',
        'bg-[var(--color-bg-dark)] text-[var(--color-primary)]',
        'shadow-md'
      )}
    >
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
        MyProductStore
      </h1>

      {/* Simple navigation – can be expanded later */}
      <nav className="flex items-center gap-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/about" className="hover:underline">
          About
        </Link>
        {/* Placeholder menu icon for future mobile menu */}
        <Menu className="h-5 w-5 cursor-pointer" aria-label="Menu" />
      </nav>
    </header>
  );
}