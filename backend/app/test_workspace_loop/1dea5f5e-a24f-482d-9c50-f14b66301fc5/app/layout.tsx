import "./globals.css";
import type { ReactNode } from "react";

/**
 * Root layout for the Next.js app.
 * - Uses Server Component (default in `app/` directory).
 * - Applies the `dark` class for Solo Leveling theme support.
 * - Provides a semantic HTML structure with accessibility in mind.
 */
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Basic SEO & viewport */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>My Next.js App</title>
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        {/* Main content area */}
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
          {children}
        </main>
      </body>
    </html>
  );
}