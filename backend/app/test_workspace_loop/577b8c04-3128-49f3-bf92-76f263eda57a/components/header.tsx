import type { FC } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const Header: FC = () => {
  return (
    <header
      className={cn(
        // Light background uses surface neutrals, dark mode uses backgroundDark
        "bg-surfaceNeutrals dark:bg-backgroundDark",
        // Border uses the primary color (same utility for both modes)
        "border-b border-primary",
        "sticky top-0 z-50"
      )}
    >
      <nav
        aria-label="Main navigation"
        className={cn(
          "max-w-7xl mx-auto flex items-center justify-between",
          "px-4 py-3 md:px-8"
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/placeholder.svg?height=40&width=40&query=Logo"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          {/* Heading typography – Inter */}
          <span className="text-xl font-semibold font-inter text-primary">
            MySite
          </span>
        </Link>

        {/* Desktop navigation */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  // Body typography – Roboto
                  "font-roboto",
                  // Primary text, accent on hover (only two color utilities)
                  "text-primary hover:text-accent",
                  "transition-colors"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile menu button (future expansion) */}
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            "md:hidden p-2 rounded-md",
            // Text uses primary, hover background uses surface neutrals
            "text-primary hover:bg-surfaceNeutrals",
            "focus:outline-none focus:ring-2 focus:ring-primary"
          )}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
};

export default Header;