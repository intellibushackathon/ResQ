/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e7f3ff",
          100: "#d2e8ff",
          400: "#4aa3ff",
          500: "#2491ff",
          600: "#1576dd",
          700: "#105db0",
          900: "#0b2747",
        },
        danger: {
          50: "#ffe8ec",
          100: "#ffd4dc",
          400: "#ff7c90",
          500: "#ff5b73",
          600: "#ea3755",
          900: "#601225",
        },
        warning: {
          400: "#ffc14a",
          500: "#ffb020",
          600: "#e08f00",
        },
        success: {
          400: "#37dc94",
          500: "#16c784",
        },
        panel: {
          950: "#06111f",
          900: "#09182b",
          800: "#10233c",
          700: "#16304c",
        },
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        panel: "0 14px 30px rgba(0,0,0,0.22)",
      },
      backdropBlur: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};

