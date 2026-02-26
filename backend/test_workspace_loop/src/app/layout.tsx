import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Load the design‑system fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Additional meta tags can be added here */}
      </head>
      <body
        className={cn(
          // Background and foreground colors from the design system
          "bg-backgroundDark text-primary",
          // Minimum height and flex layout
          "min-h-screen flex flex-col",
          // Apply the body typography defined in the design constraints
          "font-body"
        )}
      >
        {children}
      </body>
    </html>
  );
}