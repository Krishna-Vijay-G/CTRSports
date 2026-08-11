import type { Config } from "tailwindcss";

/**
 * The CTR palette, carried over from the original site so every page built here
 * looks like the same organisation. Racing yellow on carbon black is the whole
 * identity — resist adding a third accent.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        racing: {
          yellow: "#F7D619",
          "yellow-dark": "#D4BB0A",
        },
        carbon: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1A1A1A",
          700: "#222222",
          600: "#2D2D2D",
          500: "#404040",
        },
      },
      fontFamily: {
        // Supplied by next/font in src/app/layout.tsx.
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      animation: {
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
