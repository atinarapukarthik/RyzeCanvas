import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full scroll-smooth antialiased",
        // The `dark` class will be toggled by `next-themes`
        "dark"
      )}
    >
      <head />
      {/* Apply the architect‑approved color palette */}
      <body className={cn("min-h-screen bg-backgroundDark text-primary")}>
        {/* ThemeProvider makes the `dark` class toggleable via client‑side */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}