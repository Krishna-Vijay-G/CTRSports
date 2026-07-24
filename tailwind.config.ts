import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Biography ("Our Story") identity: deep navy + gold on light ──
        ctr: {
          navy: "#1B2A63", // primary heading / ink (deck indigo)
          "navy-deep": "#0E1740", // dark section backgrounds
          "navy-800": "#141E4A",
          gold: "#F4B400", // CTR eagle gold (base)
          "gold-deep": "#E29A00",
          "gold-light": "#FBD11E", // highlight bars / gradient top
          yellow: "#F7D619", // shared racing yellow
          paper: "#F5F6F8", // off-white page background
          mist: "#EAEDF3", // light photo-wash panels
          ink: "#12173A", // near-black navy text on light
          body: "#2A2F52", // body copy on light
        },
        // ── Shared with existing team site ──
        racing: {
          yellow: "#F7D619",
          "yellow-dark": "#D4BB0A",
          "yellow-glow": "rgba(247, 214, 25, 0.3)",
        },
        carbon: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1A1A1A",
          700: "#222222",
          600: "#2D2D2D",
          500: "#404040",
          400: "#555555",
          300: "#777777",
        },
      },
      fontFamily: {
        // Oswald leads the heavy condensed display face used across the deck.
        display: ["Oswald", "Rajdhani", "sans-serif"],
        heading: ["Rajdhani", "Oswald", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(27, 42, 99, 0.22)",
        "card-hover": "0 22px 48px -16px rgba(27, 42, 99, 0.32)",
        gold: "0 12px 30px -10px rgba(244, 180, 0, 0.5)",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(180deg, #FBD11E 0%, #F4B400 45%, #E29A00 100%)",
        "gold-sheen":
          "linear-gradient(120deg, #FBD11E 0%, #F4B400 40%, #E29A00 100%)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "fade-up": "fadeUp 0.7s ease-out forwards",
        marquee: "marquee 26s linear infinite",
        "chevron-run": "chevronRun 1.6s ease-in-out infinite",
        "shimmer-x": "shimmerX 2.4s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        chevronRun: {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
        shimmerX: {
          "0%": { transform: "translateX(-30%)", opacity: "0.3" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateX(30%)", opacity: "0.3" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
