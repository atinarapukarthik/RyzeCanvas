import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className={cn('flex-1 bg-[var(--color-bg-dark)] text-white py-12')}>
        <section className={cn('max-w-3xl mx-auto px-4')}>
          <h1 className={cn('text-4xl font-bold mb-8', 'font-[var(--font-heading)]')}>
            Get in Touch
          </h1>

          {/* Contact Form */}
          <form
            className={cn('grid gap-6')}
            method="POST"
            action="#"
            aria-label="Contact form"
          >
            <div className={cn('grid gap-2')}>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="Your name"
                className={cn(
                  'w-full rounded-md p-3',
                  'bg-[var(--color-surface)] text-[var(--color-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
                )}
              />
            </div>

            <div className={cn('grid gap-2')}>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="you@example.com"
                className={cn(
                  'w-full rounded-md p-3',
                  'bg-[var(--color-surface)] text-[var(--color-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
                )}
              />
            </div>

            <div className={cn('grid gap-2')}>
              <label htmlFor="message" className="sr-only">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                placeholder="Your message..."
                className={cn(
                  'w-full rounded-md p-3',
                  'bg-[var(--color-surface)] text-[var(--color-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
                )}
              />
            </div>

            <button
              type="submit"
              className={cn(
                'inline-flex items-center gap-2 self-start',
                'bg-[var(--color-primary)] text-white rounded-md px-6 py-3',
                'hover:bg-[var(--color-accent)] transition-colors'
              )}
            >
              Send Message
              <ArrowRight size={20} />
            </button>
          </form>

          {/* Social Links */}
          <section className={cn('mt-12 flex flex-col items-center gap-4')}>
            <p className={cn('text-lg', 'font-[var(--font-body)]')}>
              Or reach me on:
            </p>
            <div className={cn('flex gap-6')}>
              <Link href="https://github.com/yourprofile" aria-label="GitHub">
                <Github size={28} className="hover:text-[var(--color-primary)] transition-colors" />
              </Link>
              <Link href="https://twitter.com/yourprofile" aria-label="Twitter">
                <Twitter size={28} className="hover:text-[var(--color-primary)] transition-colors" />
              </Link>
              <Link href="https://linkedin.com/in/yourprofile" aria-label="LinkedIn">
                <Linkedin size={28} className="hover:text-[var(--color-primary)] transition-colors" />
              </Link>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}