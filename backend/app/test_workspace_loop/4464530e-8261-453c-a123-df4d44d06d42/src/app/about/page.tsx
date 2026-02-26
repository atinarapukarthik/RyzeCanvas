import Header from '@/components/header';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';
import { Code, Database, Layers } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
      <Header />

      <main
        className={cn(
          'bg-[var(--color-bg-dark)] text-[var(--color-primary)]',
          'min-h-screen py-12 px-6'
        )}
      >
        <section className="max-w-4xl mx-auto space-y-12">
          {/* Biography */}
          <article className="flex flex-col md:flex-row items-center gap-8">
            <img
              src="/placeholder.svg?height=200&width=200&query=Profile"
              alt="Profile picture"
              className="w-48 h-48 rounded-full object-cover flex-shrink-0"
            />
            <div>
              <h2
                className="text-3xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                About Me
              </h2>
              <p className="text-base leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                I am a full‑stack developer with a passion for building performant, accessible
                web applications. Over the past few years, I have worked with modern JavaScript
                frameworks, cloud services, and design systems to deliver delightful user
                experiences.
              </p>
            </div>
          </article>

          {/* Skills */}
          <section>
            <h3
              className="text-2xl font-semibold mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Skills
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <li className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg">
                <Code className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
                <span className="text-base font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                  TypeScript & JavaScript
                </span>
              </li>
              <li className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg">
                <Layers className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
                <span className="text-base font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                  React & Next.js
                </span>
              </li>
              <li className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg">
                <Database className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
                <span className="text-base font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                  PostgreSQL & MongoDB
                </span>
              </li>
              {/* Add more skill items as needed */}
            </ul>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}