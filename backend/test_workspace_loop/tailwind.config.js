/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Four colors defined by the architect for the Solo Leveling dark theme
        primary: "#2B2D42",
        backgroundDark: "#0D0D0D",
        surfaceNeutrals: "#1A1A1A",
        accent: "#FF4500",
      },
      fontFamily: {
        // Exactly two font families as per design constraints
        heading: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};