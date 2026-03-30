/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/web/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060816",
          900: "#0f172a",
          800: "#1e293b"
        },
        moss: {
          300: "#a7f3d0",
          400: "#6ee7b7",
          500: "#34d399"
        },
        sand: {
          100: "#f5f1e8",
          200: "#e9dfcf"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(167, 243, 208, 0.14), 0 24px 70px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};
