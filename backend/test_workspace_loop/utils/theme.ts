import type { Config } from "tailwindcss";

/**
 * Centralised theme definition that mirrors the Tailwind configuration.
 * This can be imported by components that need type‑safe access to the
 * design tokens (e.g. for inline styles or CSS‑in‑JS solutions).
 */
export const theme: Config["theme"]["extend"] = {
  colors: {
    primary: "#2B2D42",
    backgroundDark: "#0D0D0D",
    surfaceNeutrals: "#1A1A1A",
    accent: "#FF4500",
  },
  fontFamily: {
    heading: ["Montserrat", "sans-serif"],
    body: ["Inter", "sans-serif"],
  },
};

export type Theme = typeof theme;