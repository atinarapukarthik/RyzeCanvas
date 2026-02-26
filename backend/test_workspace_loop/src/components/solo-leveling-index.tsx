import type { FC } from 'react';
import { Home, Info, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const SoloLevelingIndex: FC = () => {
  return (
    <div
      className={cn(
        // Light theme background / text
        'bg-white text-gray-900',
        // Dark theme (Solo Leveling) – applied manually via the `dark` class
        'dark:bg-gray-900 dark:text-white',
        // Full‑screen layout
        'min-h-screen flex flex-col'
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/placeholder.svg?height=40&width=40&query=Logo"
            alt="Solo Leveling Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <h1 className="text-xl font-bold">Solo Leveling</h1>
        </div>

        {/* Theme toggle (placeholder – client‑side logic can be added later) */}
        <button
          aria-label="Toggle dark mode"
          className={cn(
            'flex items-center gap-1 rounded-md p-2',
            'bg-gray-100 dark:bg-gray-800',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors'
          )}
        >
          <Sun className="h-5 w-5 text-yellow-500 dark:hidden" />
          <Moon className="h-5 w-5 text-gray-300 hidden dark:inline-block" />
        </button>
      </header>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="flex justify-center gap-8 p-4 border-b border-gray-200 dark:border-gray-700"
      >
        <a
          href="#"
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            'text-gray-700 dark:text-gray-300',
            'hover:text-gray-900 dark:hover:text-white',
            'transition-colors'
          )}
        >
          <Home className="h-4 w-4" />
          Home
        </a>
        <a
          href="#"
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            'text-gray-700 dark:text-gray-300',
            'hover:text-gray-900 dark:hover:text-white',
            'transition-colors'
          )}
        >
          <Info className="h-4 w-4" />
          About
        </a>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Welcome to the Solo Leveling World
        </h2>
        <p className="max-w-prose text-center text-lg">
          Dive into the dark‑themed experience, powered by Next.js Server Components,
          Tailwind CSS, and Lucide icons.
        </p>
        {/* Call‑to‑action button (placeholder) */}
        <button
          className={cn(
            'rounded-md bg-indigo-600 px-6 py-3 text-white',
            'hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
            'transition-colors'
          )}
        >
          Get Started
        </button>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        © {new Date().getFullYear()} Solo Leveling. All rights reserved.
      </footer>
    </div>
  );
};

export default SoloLevelingIndex;