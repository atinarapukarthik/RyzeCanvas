import type { ReactNode } from "react";

import "./globals.css";
import { cn } from "@/lib/utils";

/**
 * Root layout – Server Component
 *
 * Provides the HTML skeleton, global navigation, and footer.
 * The `dark` class is applied manually to enable the Solo Leveling
 * dark theme out‑of‑the‑box.
 */
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark")}>
      <head>
        <title>Landing Page</title>
        <meta name="description" content="Landing page for the project" />
      </head>

      <body className={cn("min-h-screen flex flex-col")}>
        {/* -------------------------------------------------
            Header / Navigation
            ------------------------------------------------- */}
        <header className={cn("bg-primary-600 text-white")}>
          <nav
            className={cn(
              "container mx-auto flex items-center justify-between p-4 gap-4"
            )}
            aria-label="Primary navigation"
          >
            <h1 className={cn("text-2xl font-bold")}>My Project</h1>
            {/* Navigation links can be added here */}
          </nav>
        </header>

        {/* -------------------------------------------------
            Main Content
            ------------------------------------------------- */}
        <main className={cn("flex-1 container mx-auto p-4")}>{children}</main>

        {/* -------------------------------------------------
            Footer
            ------------------------------------------------- */}
        <footer
          className={cn(
            "bg-gray-200 dark:bg-gray-800 text-center p-4"
          )}
        >
          © {new Date().getFullYear()} My Company
        </footer>
      </body>
    </html>
  );
}