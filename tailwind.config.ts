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
        // Surfaces, darkest first. The steps between them are deliberately
        // wide: on a dark page a 2-3% difference reads as one flat expanse, so
        // each level is far enough apart to be told apart at a glance.
        page: "#000000",
        surface: "#0C0E11",
        panel: "#1B2027",
        line: "#39414D",
        // Type. `muted` and `faint` are both well clear of the 4.5:1 floor
        // against `panel`, which is the darkest thing they ever sit on.
        fg: {
          DEFAULT: "#FFFFFF",
          muted: "#C2C9D4",
          faint: "#98A1AF",
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
