/**
 * Every word and picture on the landing page except the sports cards, which are
 * rows in `ctr_sports` and have their own model in src/lib/sports.ts.
 *
 * The LIVE content is one JSONB document in `ctr_content` under the key
 * 'landing', edited at /admin/landing. What lives here is the TYPE plus the
 * DEFAULTS, which:
 *
 *   1. render the page when the database is unreachable or has no row yet, so
 *      it can never come up blank
 *   2. are the base every stored field is merged over, so a partial or
 *      malformed document degrades field by field rather than breaking the page
 *   3. are what the admin's "Load defaults" button restores
 *
 * A fresh database needs no seeding: with no row the page renders these and the
 * editor opens on them, and saving once writes the row.
 *
 * A document rather than a column per field: the shape is nested, it changes
 * whenever the design does, and nothing ever queries inside it.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { ABOUT_PHOTOS, HERO_PHOTO } from "@/config/images";

export const SOCIAL_ICONS = ["instagram", "facebook", "twitter", "youtube", "website"] as const;
export type SocialIconName = (typeof SOCIAL_ICONS)[number];

export type NavLink = { label: string; href: string };
export type SocialLink = { label: string; href: string; icon: SocialIconName };
export type LabelledPhoto = { src: string; label: string };

export type LandingContent = {
  brand: { name: string; subtitle: string; logo: string };
  nav: { links: NavLink[]; cta: NavLink };
  splash: { title: string; logo: string };
  hero: {
    headline: string;
    ctaLabel: string;
    ctaHref: string;
    proof: string;
    background: string;
    cardTitle: string;
    cardSubtitle: string;
    cardCtaLabel: string;
    cardCtaHref: string;
  };
  about: {
    label: string;
    title: string;
    heading: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    photos: LabelledPhoto[];
  };
  sportsSection: { label: string; title: string };
  ctaBand: { label: string; title: string; body: string; ctaLabel: string; ctaHref: string };
  socials: SocialLink[];
};

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  brand: {
    name: "CTR Unified",
    subtitle: "Sports Collective",
    logo: "/images/brand/ctr-logo.webp",
  },
  nav: {
    links: [
      { label: "Home", href: "#top" },
      { label: "About", href: "#about" },
      { label: "Sports", href: "#sports" },
    ],
    cta: { label: "Get in Touch", href: "#footer" },
  },
  splash: {
    title: "CTR Unified",
    logo: "/images/brand/ctr-logo.webp",
  },
  hero: {
    /** Rendered with whitespace-pre-line, so newlines here are real line breaks. */
    headline: "One Nation. One Championship.",
    ctaLabel: "Explore Sports",
    ctaHref: "#sports",
    proof: "Six programmes competing under one banner.",
    background: HERO_PHOTO,
    cardTitle: "Our Programmes",
    cardSubtitle: "The disciplines CTR runs today",
    cardCtaLabel: "See all",
    cardCtaHref: "#sports",
  },
  about: {
    label: "About CTR",
    title: "One organisation behind every discipline we compete in",
    heading: "Built for athletes, run like one team",
    /** Blank lines separate paragraphs — one <p> each. */
    body: "CTR Unified brings athletes, teams and sporting communities together under a single platform. From cricket and volleyball to Formula 4 racing, every programme runs with its own coaching structure and competitive calendar.\n\nWhat they share is one standard of preparation, one identity, and one long-term commitment to developing Indian sporting talent.",
    ctaLabel: "Explore Sports",
    ctaHref: "#sports",
    photos: ABOUT_PHOTOS.map((entry) => ({ ...entry })),
  },
  sportsSection: {
    label: "Sports in CTR Unified",
    title: "Every discipline, one standard of preparation",
  },
  ctaBand: {
    label: "One Team",
    title: "Multiple sports. One unified banner.",
    body: "Cricket, volleyball, hockey, pickleball and motorsport — developed under a single organisation.",
    ctaLabel: "See the Programmes",
    ctaHref: "#sports",
  },
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/incrc_", icon: "instagram" },
    { label: "Facebook", href: "https://www.facebook.com/chennaiturboriders", icon: "facebook" },
    { label: "Twitter", href: "https://twitter.com/chennaiturbo", icon: "twitter" },
    { label: "YouTube", href: "https://www.youtube.com/@chennaiturboriders", icon: "youtube" },
  ],
};

/* ─────────────────────────── Normalisation ─────────────────────────── */

const SHORT_MAX = 240;
const BODY_MAX = 3000;
const URL_MAX = 600;
export const MAX_SOCIALS = 8;
export const MAX_NAV_LINKS = 8;
/** The layout puts these either side of the about copy; a third has nowhere to go. */
export const ABOUT_PHOTO_COUNT = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Empty is allowed — clearing a line of copy is a real editorial choice, and the
 * components already skip what is blank. Only a MISSING or wrong-typed field
 * falls back to the default.
 */
function text(value: unknown, fallback: string, max = SHORT_MAX): string {
  return typeof value === "string" ? value.slice(0, max).trim() : fallback;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Images are the exception to "empty is allowed": an empty src renders as a
 * broken image, so a blank or unusable one falls back to the default. A
 * leading-slash path points at /public; anything else must be http(s), which is
 * what keeps a `javascript:` payload out of an <img src>.
 */
function image(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed || trimmed.startsWith("//")) return fallback;
  return trimmed.startsWith("/") || isHttpUrl(trimmed) ? trimmed : fallback;
}

/** Same rule as an image, plus in-page anchors, which is what most CTAs are. */
function link(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  return isHttpUrl(trimmed) ? trimmed : fallback;
}

function navLinks(value: unknown, fallback: NavLink[]): NavLink[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter(isRecord)
    .slice(0, MAX_NAV_LINKS)
    .map((entry) => ({ label: text(entry.label, ""), href: link(entry.href, "#top") }))
    // A link with no words is invisible and unclickable — drop it rather than
    // render a gap in the nav.
    .filter((entry) => entry.label !== "");
}

function socials(value: unknown, fallback: SocialLink[]): SocialLink[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter(isRecord)
    .slice(0, MAX_SOCIALS)
    .map((entry) => ({
      label: text(entry.label, ""),
      href: link(entry.href, "#"),
      icon: (SOCIAL_ICONS as readonly string[]).includes(entry.icon as string)
        ? (entry.icon as SocialIconName)
        : "website",
    }))
    .filter((entry) => entry.label !== "");
}

/** Always exactly ABOUT_PHOTO_COUNT, because the layout has exactly that many slots. */
function aboutPhotos(value: unknown, fallback: LabelledPhoto[]): LabelledPhoto[] {
  const source = Array.isArray(value) ? value : [];
  return fallback.map((defaults, index) => {
    const entry = source[index];
    if (!isRecord(entry)) return { ...defaults };
    return { src: image(entry.src, defaults.src), label: text(entry.label, defaults.label) };
  });
}

/**
 * Turns whatever came out of the `ctr_content` row into a valid LandingContent.
 *
 * Every field is merged over the defaults independently, so a document that is
 * partial, stale or outright malformed degrades one field at a time rather than
 * taking the landing page down. Runs on read as well as on write — the page
 * never trusts the stored shape.
 */
export function normaliseLandingContent(input: unknown): LandingContent {
  const d = DEFAULT_LANDING_CONTENT;
  const root = isRecord(input) ? input : {};

  const brand = isRecord(root.brand) ? root.brand : {};
  const nav = isRecord(root.nav) ? root.nav : {};
  const navCta = isRecord(nav.cta) ? nav.cta : {};
  const splash = isRecord(root.splash) ? root.splash : {};
  const hero = isRecord(root.hero) ? root.hero : {};
  const about = isRecord(root.about) ? root.about : {};
  const sportsSection = isRecord(root.sportsSection) ? root.sportsSection : {};
  const ctaBand = isRecord(root.ctaBand) ? root.ctaBand : {};

  return {
    brand: {
      name: text(brand.name, d.brand.name),
      subtitle: text(brand.subtitle, d.brand.subtitle),
      logo: image(brand.logo, d.brand.logo),
    },
    nav: {
      links: navLinks(nav.links, d.nav.links),
      cta: {
        label: text(navCta.label, d.nav.cta.label),
        href: link(navCta.href, d.nav.cta.href),
      },
    },
    splash: {
      title: text(splash.title, d.splash.title),
      logo: image(splash.logo, d.splash.logo),
    },
    hero: {
      headline: text(hero.headline, d.hero.headline, BODY_MAX),
      ctaLabel: text(hero.ctaLabel, d.hero.ctaLabel),
      ctaHref: link(hero.ctaHref, d.hero.ctaHref),
      proof: text(hero.proof, d.hero.proof),
      background: image(hero.background, d.hero.background),
      cardTitle: text(hero.cardTitle, d.hero.cardTitle),
      cardSubtitle: text(hero.cardSubtitle, d.hero.cardSubtitle),
      cardCtaLabel: text(hero.cardCtaLabel, d.hero.cardCtaLabel),
      cardCtaHref: link(hero.cardCtaHref, d.hero.cardCtaHref),
    },
    about: {
      label: text(about.label, d.about.label),
      title: text(about.title, d.about.title),
      heading: text(about.heading, d.about.heading),
      body: text(about.body, d.about.body, BODY_MAX),
      ctaLabel: text(about.ctaLabel, d.about.ctaLabel),
      ctaHref: link(about.ctaHref, d.about.ctaHref),
      photos: aboutPhotos(about.photos, d.about.photos),
    },
    sportsSection: {
      label: text(sportsSection.label, d.sportsSection.label),
      title: text(sportsSection.title, d.sportsSection.title),
    },
    ctaBand: {
      label: text(ctaBand.label, d.ctaBand.label),
      title: text(ctaBand.title, d.ctaBand.title),
      body: text(ctaBand.body, d.ctaBand.body, BODY_MAX),
      ctaLabel: text(ctaBand.ctaLabel, d.ctaBand.ctaLabel),
      ctaHref: link(ctaBand.ctaHref, d.ctaBand.ctaHref),
    },
    socials: socials(root.socials, d.socials),
  };
}

/** Blank-line-separated copy becomes one paragraph per entry. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
