import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RyzeCanvas - AI-Powered Code Generation",
  description: "Generate production-ready React & Next.js components in seconds. The AI canvas that thinks like a senior engineer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${syne.variable} ${dmSans.variable} font-body antialiased h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
