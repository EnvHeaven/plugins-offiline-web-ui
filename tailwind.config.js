/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/web/**/*.{html,ts}", "./libs/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "#090d15",
          surface: "#0f1623",
          raised:  "#151e2e",
          overlay: "#1c2639",
          hover:   "#202d42",
        },
        border: {
          subtle:  "rgba(255,255,255,0.05)",
          default: "rgba(255,255,255,0.09)",
          strong:  "rgba(255,255,255,0.15)",
          accent:  "rgba(52,211,153,0.30)",
        },
        tx: {
          primary:   "#e2e8f0",
          secondary: "#8892a4",
          muted:     "#4b5870",
          disabled:  "#2d3748",
          inverse:   "#0a0d14",
        },
        accent: {
          DEFAULT: "#10b981",
          light:   "#34d399",
          dim:     "rgba(16,185,129,0.12)",
          border:  "rgba(16,185,129,0.25)",
        },
        warn: {
          DEFAULT: "#f59e0b",
          dim:     "rgba(245,158,11,0.12)",
        },
        danger: {
          DEFAULT: "#ef4444",
          dim:     "rgba(239,68,68,0.12)",
        },
        info: {
          DEFAULT: "#3b82f6",
          dim:     "rgba(59,130,246,0.12)",
        },
        ink: {
          950: "#060816",
          900: "#0f172a",
          800: "#1e293b",
        },
        moss: {
          300: "#a7f3d0",
          400: "#6ee7b7",
          500: "#34d399",
        },
        sand: {
          100: "#f5f1e8",
          200: "#e9dfcf",
        },
      },
      boxShadow: {
        glow:    "0 0 0 1px rgba(52,211,153,0.10), 0 16px 48px rgba(9,13,21,0.60)",
        card:    "0 1px 3px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.06)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.10)",
        panel:   "inset 0 0 0 1px rgba(255,255,255,0.06)",
        accent:  "0 0 0 1px rgba(52,211,153,0.30), 0 4px 20px rgba(16,185,129,0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":    "fadeIn 0.15s ease-out",
        "slide-in":   "slideIn 0.18s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-6px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
