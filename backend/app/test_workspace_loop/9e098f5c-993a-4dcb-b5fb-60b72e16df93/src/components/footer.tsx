import { cn } from '@/lib/utils';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer
      className={cn(
        'py-8 px-4 md:px-8',
        'bg-[var(--color-primary)] text-white',
        'flex flex-col items-center'
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Github className="w-5 h-5" aria-hidden="true" />
        <span className="font-medium">© {new Date().getFullYear()} Landing Page 001</span>
      </div>
      <nav aria-label="Footer navigation">
        <ul className="flex flex-wrap gap-4 text-sm">
          <li>
            <a href="#" className="hover:underline">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="#" className="hover:underline">
              Terms of Service
            </a>
          </li>
          <li>
            <a href="#" className="hover:underline">
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}