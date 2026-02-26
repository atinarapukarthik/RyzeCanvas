import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Footer() {
  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-white',
        'py-8',
        'mt-12'
      )}
      aria-label="Site footer"
    >
      <div className="container mx-auto flex flex-col items-center gap-4 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} LandingCo. All rights reserved.
        </p>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}