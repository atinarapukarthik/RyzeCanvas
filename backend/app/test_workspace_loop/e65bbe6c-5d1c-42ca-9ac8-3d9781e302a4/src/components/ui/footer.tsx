import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

export function Footer() {
  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-white py-8',
        'flex flex-col items-center gap-6'
      )}
    >
      <nav aria-label="Footer navigation" className={cn('flex gap-8')}>
        <Link href="/" className={cn('hover:underline')}>
          Home
        </Link>
        <Link href="/about" className={cn('hover:underline')}>
          About
        </Link>
        <Link href="/contact" className={cn('hover:underline')}>
          Contact
        </Link>
        <Link href="/privacy" className={cn('hover:underline')}>
          Privacy
        </Link>
      </nav>

      <div className={cn('flex items-center gap-2 text-sm')}>
        <Menu className="h-4 w-4" aria-hidden="true" />
        <span>© {new Date().getFullYear()} Your Company. All rights reserved.</span>
      </div>
    </footer>
  );
}