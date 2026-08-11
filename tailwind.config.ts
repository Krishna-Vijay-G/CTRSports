import type { Config } from "tailwindcss";

/**
 * Dark, card-led palette.
 *
 * The layout is the same one the design reference uses — a page colour showing
 * around one big rounded card — but inverted: the page is near-black and the
 * card sits a shade above it. Depth comes from those two steps plus `panel` for
 * anything nested inside the card, never from shadows, which do not read on a
 * dark background.
 *
 * `accent` is the one bright colour, and it carries every primary button, badge
 * and the call-to-action band. `accent-ink` is the only thing that may sit ON
 * accent — near-black, because yellow needs dark type over it.
 *
 * The `carbon` and `racing` scales exist only for the admin.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#F7D619",
          dark: "#E0BF06",
          ink: "#0A0A0A",
        },
        // Surfaces, darkest first.
        page: "#050506",
        surface: "#0F1114",
        panel: "#181B20",
        line: "#262A31",
        // Type.
        fg: {
          DEFAULT: "#F3F5F7",
          muted: "#A2AAB6",
          faint: "#6E7784",
        },

        // Admin only.
        racing: {
          yellow: "#F7D619",
          "yellow-dark": "#D4BB0A",
        },
        carbon: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1A1A1A",
          700: "#222222",
        },
      },
      fontFamily: {
        // Supplied by next/font in src/app/layout.tsx.
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "28px",
        panel: "22px",
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
