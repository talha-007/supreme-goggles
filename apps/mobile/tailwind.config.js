/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#e8e0ff",
          200: "#d4c4ff",
          300: "#b89fff",
          400: "#8f66f0",
          500: "#5c22d4",
          600: "#3a09b0",
          700: "#2f078f",
          800: "#260673",
          900: "#1e0558",
          950: "#14033d",
        },
      },
    },
  },
  plugins: [],
};
