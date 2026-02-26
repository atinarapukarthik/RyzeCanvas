import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // manual dark mode toggle
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 3‑5 color palette – adjust to match the Solo Leveling theme
        primary: '#1E3A8A', // indigo‑900
        secondary: '#F59E0B', // amber‑500
        accent: '#10B981', // emerald‑500
        background: {
          light: '#F9FAFB', // gray‑50
          dark: '#111827', // gray‑900
        },
        foreground: {
          light: '#1F2937', // gray‑800
          dark: '#F3F4F6', // gray‑100
        },
      },
      fontFamily: {
        // 2 fonts – replace with the ones defined by the Architect if different
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;