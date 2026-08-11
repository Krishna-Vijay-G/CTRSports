/**
 * Everything on the landing page that is NOT the sports list.
 *
 * This file is the "manual intervention" half of the site: brand, hero, about
 * copy, socials and section headings all change by editing here and
 * redeploying. Only the sports cards are database-backed, because those are the
 * ones that actually turn over.
 *
 * Image paths point at pre-compressed .webp files under /public/images. Drop a
 * PNG/JPEG in there and run `npm run webp` to produce them.
 */

export const SITE = {
  url: "https://ctrsports.in",
  name: "CTR Unified",
  locale: "en_IN",
} as const;

export const BRAND = {
  name: "CTR UNIFIED",
  subtitle: "SPORTS COLLECTIVE",
  logo: "/images/brand/ctr-logo.webp",
  /**
   * The floating watermark in the hero. It is the same artwork as `logo` — the
   * source project shipped two byte-identical copies under different names, and
   * there is no reason to make visitors download it twice.
   */
  wordmark: "/images/brand/ctr-logo.webp",
  homeAriaLabel: "CTR Unified home",
} as const;

export const SPLASH = {
  title: "CTR UNIFIED",
  ariaLabel: "Loading CTR Unified",
  logo: "/images/brand/ctr-logo.webp",
  /** Upper bound only — the splash leaves as soon as the page has loaded. */
  maxVisibleMs: 1800,
} as const;

export const HERO = {
  kicker: "CTR SPORTS COLLECTIVE",
  title: "CTR UNIFIED",
  /** Rendered with whitespace-pre-line, so newlines here are real line breaks. */
  subtitle: "One Team. Multiple Sports.\nUnlimited Possibilities.",
  background: "/images/hero/background.webp",
  ctaLabel: "Explore Sports",
  ctaHref: "#sports",
} as const;

export const ABOUT = {
  kicker: "ABOUT CTR",
  title: "One Unified Platform",
  /** One <p> per entry. */
  body: [
    "CTR Unified is a multi-sport organization that brings together athletes, teams, and sporting communities under one unified platform. From cricket and volleyball to Formula 4 racing and emerging sports, CTR Unified promotes excellence, teamwork, innovation, and competitive spirit across every discipline.",
    "Each programme runs with its own coaching structure and competitive calendar, while sharing one standard of preparation, one identity, and one long-term commitment to developing Indian sporting talent.",
  ],
} as const;

export const SPORTS_SECTION = {
  kicker: "SPORTS IN CTR UNIFIED",
  title: "Unified Sports Programs",
} as const;

/** Anchors in the sticky header, in order. */
export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Sports", href: "#sports" },
] as const;

export type SocialIconName = "instagram" | "facebook" | "twitter" | "youtube" | "website";

export const SOCIALS: { label: string; href: string; icon: SocialIconName }[] = [
  { label: "Instagram", href: "https://www.instagram.com/incrc_", icon: "instagram" },
  { label: "Facebook", href: "https://www.facebook.com/chennaiturboriders", icon: "facebook" },
  { label: "Twitter", href: "https://twitter.com/chennaiturbo", icon: "twitter" },
  { label: "YouTube", href: "https://www.youtube.com/@chennaiturboriders", icon: "youtube" },
];
