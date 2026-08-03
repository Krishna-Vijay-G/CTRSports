import {
  DEFAULT_LANDING_CONTENT,
  SOCIAL_ICONS,
  type LandingContent,
  type SocialIconName,
  type SocialLink,
  type Sport,
} from "@/data/landingContent";

/**
 * Turns whatever came out of the `site_content` row into a valid LandingContent.
 *
 * Every field is merged over the defaults independently, so a document that is
 * partial, stale or outright malformed degrades one field at a time rather than
 * taking the landing page down. This runs on read as well as on write — the
 * page never trusts the stored shape.
 *
 * Deliberate blanks are honoured: a field present as an empty string stays
 * empty. Only a MISSING or wrong-typed field falls back to the default. Images
 * are the exception — an empty src renders as a broken image, so those fall
 * back too.
 */

const SHORT_MAX = 200;
const BODY_MAX = 2000;
export const MAX_SPORTS = 24;
export const MAX_SOCIALS = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Empty is allowed — clearing a line of copy is a real editorial choice. */
function text(value: unknown, fallback: string, max = SHORT_MAX): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Leading-slash paths point at /public; anything else must be http(s). */
function image(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  return trimmed.startsWith("/") || isHttpUrl(trimmed) ? trimmed : fallback;
}

/** Same rule as an image, plus "#" — the placeholder for a card with nowhere to go. */
function link(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed === "#") return trimmed;
  return image(trimmed, fallback);
}

function ms(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function socialIcon(value: unknown): SocialIconName {
  return typeof value === "string" && (SOCIAL_ICONS as readonly string[]).includes(value)
    ? (value as SocialIconName)
    : "website";
}

function normaliseSports(value: unknown, defaults: Sport[]): Sport[] {
  if (!Array.isArray(value)) return defaults;

  const seen = new Set<string>();

  return value
    .filter(isRecord)
    .slice(0, MAX_SPORTS)
    .map((raw, index): Sport => {
      // Ids are React keys and must be unique; a blank or duplicate gets one.
      let id = text(raw.id, "").replace(/\s+/g, "-");
      if (!id || seen.has(id)) id = `sport-${index + 1}`;
      seen.add(id);

      return {
        id,
        name: text(raw.name, ""),
        team_name: text(raw.team_name, ""),
        description: text(raw.description, "", BODY_MAX),
        website_url: link(raw.website_url, "#"),
        logo_image: image(raw.logo_image, DEFAULT_LANDING_CONTENT.brand.logo_image),
        visit_label: text(raw.visit_label, "Visit", 40),
      };
    });
}

function normaliseSocials(value: unknown, defaults: SocialLink[]): SocialLink[] {
  if (!Array.isArray(value)) return defaults;

  return value
    .filter(isRecord)
    .slice(0, MAX_SOCIALS)
    // A social button with no destination is just a dead circle.
    .filter((raw) => typeof raw.href === "string" && isHttpUrl(raw.href.trim()))
    .map((raw): SocialLink => ({
      label: text(raw.label, "Link", 40),
      href: raw.href!.toString().trim(),
      icon: socialIcon(raw.icon),
    }));
}

export function normaliseLandingContent(raw: unknown): LandingContent {
  const d = DEFAULT_LANDING_CONTENT;
  if (!isRecord(raw)) return d;

  const splash = isRecord(raw.splash) ? raw.splash : {};
  const brand = isRecord(raw.brand) ? raw.brand : {};
  const hero = isRecord(raw.hero) ? raw.hero : {};
  const sportsSection = isRecord(raw.sports_section) ? raw.sports_section : {};

  return {
    splash: {
      title: text(splash.title, d.splash.title),
      aria_label: text(splash.aria_label, d.splash.aria_label),
      logo_image: image(splash.logo_image, d.splash.logo_image),
      // Clamped so a typo cannot leave visitors staring at a splash screen.
      fade_in_ms: ms(splash.fade_in_ms, d.splash.fade_in_ms, 0, 10_000),
      hide_ms: ms(splash.hide_ms, d.splash.hide_ms, 0, 12_000),
    },
    brand: {
      name: text(brand.name, d.brand.name),
      subtitle: text(brand.subtitle, d.brand.subtitle),
      logo_image: image(brand.logo_image, d.brand.logo_image),
      home_aria_label: text(brand.home_aria_label, d.brand.home_aria_label),
    },
    hero: {
      kicker: text(hero.kicker, d.hero.kicker),
      title: text(hero.title, d.hero.title),
      subtitle: text(hero.subtitle, d.hero.subtitle, BODY_MAX),
      about_title: text(hero.about_title, d.hero.about_title),
      about_body: text(hero.about_body, d.hero.about_body, BODY_MAX),
      background_image: image(hero.background_image, d.hero.background_image),
      cta_label: text(hero.cta_label, d.hero.cta_label, 40),
    },
    sports_section: {
      kicker: text(sportsSection.kicker, d.sports_section.kicker),
      title: text(sportsSection.title, d.sports_section.title),
    },
    sports: normaliseSports(raw.sports, d.sports),
    socials: normaliseSocials(raw.socials, d.socials),
  };
}
