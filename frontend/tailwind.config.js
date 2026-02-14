/** @type {import('tailwindcss').Config} */
/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                display: ["var(--font-display)", "system-ui", "sans-serif"],
                body: ["var(--font-body)", "system-ui", "sans-serif"],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                surface: "hsl(var(--surface))",
                "surface-hover": "hsl(var(--surface-hover))",
                success: "hsl(var(--success))",
                warning: "hsl(var(--warning))",
                neon: "hsl(var(--neon-text))",
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "glow-pulse": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                "float-delayed": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-15px)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "slide-in-right": {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                marquee: {
                    "0%": { transform: "translateX(0%)" },
                    "100%": { transform: "translateX(-50%)" },
                },
                "aurora-shift": {
                    "0%": { transform: "translate(0%, 0%) rotate(0deg) scale(1)" },
                    "33%": { transform: "translate(5%, -3%) rotate(2deg) scale(1.05)" },
                    "66%": { transform: "translate(-3%, 5%) rotate(-1deg) scale(0.97)" },
                    "100%": { transform: "translate(0%, 0%) rotate(0deg) scale(1)" },
                },
                "aurora-shift-2": {
                    "0%": { transform: "translate(0%, 0%) rotate(0deg) scale(1)" },
                    "33%": { transform: "translate(-4%, 4%) rotate(-2deg) scale(1.03)" },
                    "66%": { transform: "translate(4%, -2%) rotate(1deg) scale(0.95)" },
                    "100%": { transform: "translate(0%, 0%) rotate(0deg) scale(1)" },
                },
                "beam-slide": {
                    "0%": { transform: "translateX(-100%) rotate(-45deg)" },
                    "100%": { transform: "translateX(300%) rotate(-45deg)" },
                },
                "pulse-ring": {
                    "0%": { transform: "scale(1)", opacity: "0.6" },
                    "50%": { transform: "scale(1.15)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "0" },
                },
                "text-reveal": {
                    "0%": { opacity: "0", transform: "translateY(100%)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "border-beam": {
                    "0%": { "offset-distance": "0%" },
                    "100%": { "offset-distance": "100%" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.5s ease-out",
                "fade-in-up": "fade-in-up 0.6s ease-out",
                "glow-pulse": "glow-pulse 2s ease-in-out infinite",
                float: "float 6s ease-in-out infinite",
                "float-delayed": "float-delayed 8s ease-in-out infinite",
                shimmer: "shimmer 2s linear infinite",
                "slide-in-right": "slide-in-right 0.3s ease-out",
                marquee: "marquee var(--marquee-duration, 30s) linear infinite",
                "aurora-1": "aurora-shift 15s ease-in-out infinite",
                "aurora-2": "aurora-shift-2 20s ease-in-out infinite",
                "beam-slide": "beam-slide 8s ease-in-out infinite",
                "pulse-ring": "pulse-ring 2s ease-out infinite",
                "text-reveal": "text-reveal 0.6s ease-out forwards",
                "border-beam": "border-beam 6s linear infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
