module.exports = {
  darkMode: "class", // Enable manual dark mode toggling via the .dark class
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2C2F33",
        backgroundDark: "#1A1B1E",
        surfaceNeutrals: "#3A3F44",
        accent: "#E5C07B",
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};