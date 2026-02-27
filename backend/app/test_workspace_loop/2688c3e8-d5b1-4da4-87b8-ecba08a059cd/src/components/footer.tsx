import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className={cn(
        'bg-[var(--color-bg-dark)] text-white',
        'border-t border-[var(--color-surface)]',
        'py-10'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Site Links */}
        <div>
          <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Quick Links
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/shop" className="hover:text-[var(--color-primary)] transition-colors">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[var(--color-primary)] transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[var(--color-primary)] transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter placeholder */}
        <div>
          <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Newsletter
          </h2>
          <p className="text-sm text-[var(--color-surface)]">
            Stay updated with our latest products and offers. Subscribe to our newsletter.
          </p>
          {/* Input & button could be added here in future */}
        </div>

        {/* Social Media */}
        <div>
          <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Follow Us
          </h2>
          <div className="flex space-x-4">
            <a
              href="#"
              aria-label="Facebook"
              className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            >
              <Facebook className="h-5 w-5 text-white" aria-hidden="true" />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            >
              <Twitter className="h-5 w-5 text-white" aria-hidden="true" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
            >
              <Instagram className="h-5 w-5 text-white" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[var(--color-surface)] pt-4 text-center text-sm text-[var(--color-surface)]">
        © {new Date().getFullYear()} ShopCo. All rights reserved.
      </div>
    </footer>
  );
}