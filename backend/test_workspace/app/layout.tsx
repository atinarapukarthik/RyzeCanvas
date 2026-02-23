import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";

// Define fonts based on design guidelines
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-heading", // Custom CSS variable for heading font
  display: "swap",
});

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body", // Custom CSS variable for body font
  display: "swap",
});

export const metadata: Metadata = {
  title: "Solo Leveling Index",
  description: "A fan-made index for the Solo Leveling series.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Apply dark class for Solo Leveling theme */}
      <body
        className={`${inter.variable} ${roboto.variable} font-body bg-background-dark text-white min-h-screen`}
        style={{
          backgroundImage: "url('/images/solo-leveling-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {children}
      </body>
    </html>
  );
}