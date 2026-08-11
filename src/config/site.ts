/**
 * Everything on the landing page that is NOT the sports list.
 *
 * This file is the "manual intervention" half of the site: brand, hero, about
 * copy, socials and section headings all change by editing here and
 * redeploying. Only the sports cards are database-backed, because those are the
 * ones that actually turn over.
 *
 * Photography lives in src/config/images.ts, which is currently placeholders.
 * Logo paths here point at pre-compressed .webp files under /public/images —
 * drop a PNG/JPEG in there and run `npm run webp` to produce them.
 */

import { ABOUT_PHOTOS, HERO_PHOTO } from "@/config/images";

export const SITE = {
  url: "https://ctrsports.in",
  name: "CTR Unified",
  locale: "en_IN",
} as const;

export const BRAND = {
  name: "CTR Unified",
  subtitle: "Sports Collective",
  logo: "/images/brand/ctr-logo.webp",
  homeAriaLabel: "CTR Unified home",
} as const;

export const SPLASH = {
  title: "CTR Unified",
  ariaLabel: "Loading CTR Unified",
  logo: "/images/brand/ctr-logo.webp",
  /** Upper bound only — the splash leaves as soon as the page has loaded. */
  maxVisibleMs: 1800,
} as const;

/** Anchors in the hero's overlay nav, in order. */
export const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Sports", href: "#sports" },
] as const;

export const HERO = {
  /** Rendered with whitespace-pre-line, so the newlines are the real line breaks. */
  headline: "One Nation. One Championship.",
  cta: { label: "Explore Sports", href: "#sports" },
  /** The line beside the stacked crests at the bottom of the hero. */
  proof: "Six programmes competing under one banner.",
  background: HERO_PHOTO,
  /** The card floating over the right of the hero. */
  card: {
    title: "Our Programmes",
    subtitle: "The disciplines CTR runs today",
    ctaLabel: "See all",
    ctaHref: "#sports",
  },
  /** Sits top-right of the nav bar. */
  navCta: { label: "Get in Touch", href: "#footer" },
} as const;

export const ABOUT = {
  label: "About CTR",
  title: "One organisation behind every discipline we compete in",
  heading: "Built for athletes, run like one team",
  /** One <p> per entry. */
  body: [
    "CTR Unified brings athletes, teams and sporting communities together under a single platform. From cricket and volleyball to Formula 4 racing, every programme runs with its own coaching structure and competitive calendar.",
    "What they share is one standard of preparation, one identity, and one long-term commitment to developing Indian sporting talent.",
  ],
  cta: { label: "Explore Sports", href: "#sports" },
  photos: ABOUT_PHOTOS,
} as const;

export const SPORTS_SECTION = {
  label: "Sports in CTR Unified",
  title: "Every discipline, one standard of preparation",
} as const;

/** The accent-coloured band between the sports grid and the footer. */
export const CTA_BAND = {
  label: "One Team",
  title: "One Nation. One Championship.",
  body: "Cricket, volleyball, hockey, pickleball and motorsport — developed under a single organisation.",
  cta: { label: "See the Programmes", href: "#sports" },
} as const;

export type SocialIconName = "instagram" | "facebook" | "twitter" | "youtube" | "website";

export const SOCIALS: { label: string; href: string; icon: SocialIconName }[] = [
  { label: "Instagram", href: "https://www.instagram.com/incrc_", icon: "instagram" },
  { label: "Facebook", href: "https://www.facebook.com/chennaiturboriders", icon: "facebook" },
  { label: "Twitter", href: "https://twitter.com/chennaiturbo", icon: "twitter" },
  { label: "YouTube", href: "https://www.youtube.com/@chennaiturboriders", icon: "youtube" },
];
