/**
 * Every word and picture on the landing page except the sports cards, which are
 * rows in `ctr.sports` and have their own model in src/lib/sports.ts.
 *
 * The LIVE content is rows of `ctr.page_sections` and `ctr.banners`, assembled
 * back into one document by `readPage`, edited at /console/landing. What lives
 * here is the TYPE plus BLANK_LANDING_CONTENT — the shape with none of the
 * words — which is the base every stored field is merged over, so a partial or
 * malformed document degrades field by field rather than breaking the page.
 *
 * There used to be a third job and a DEFAULTS constant to do it: render the
 * whole page when the database had no row. It always had no row, so the site was
 * served from this file while the tables meant to hold it sat empty, and an
 * outage published a complete, plausible, out-of-date page that nobody could
 * tell from the real one. A fresh database is SEEDED now — `npm run db:seed`,
 * from scripts/seed-data/landing.json — and a database that cannot be read
 * renders the error boundary.
 *
 * The document shape survives the decomposition because `readPage` puts it back:
 * it is nested, it changes whenever the design does, and nothing queries inside
 * it. One row per top-level key is a storage detail, not a second model.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */


import { normaliseBanners, type Banner } from "@/lib/banners";
import {
  BODY_MAX,
  image,
  isRecord,
  link,
  list,
  oneOf,
  optionalText,
  text,
} from "@/lib/normalise";

export const SOCIAL_ICONS = ["instagram", "facebook", "twitter", "youtube", "website"] as const;
export type SocialIconName = (typeof SOCIAL_ICONS)[number];

export type NavLink = { label: string; href: string };
export type SocialLink = { label: string; href: string; icon: SocialIconName };
export type LabelledPhoto = { src: string; label: string };

export type LandingContent = {
  brand: { name: string; subtitle: string; logo: string };
  nav: { links: NavLink[]; cta: NavLink };
  splash: { title: string; logo: string };
  /** The rotating panels at the top of the page. Modelled in src/lib/banners.ts. */
  banners: Banner[];
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
  /**
   * Where the organisation actually is, and how to reach it.
   *
   * In the footer, which is where the header's "Get in Touch" has always
   * pointed — the button existed before there was anything at the other end of
   * it. Part of the LANDING document rather than a page of its own, because the
   * footer is drawn on every route from this one document: an address edited
   * here is corrected on /incrc, on a circuit and on a deck at the same time.
   *
   * Every field is optional. Blank leaves that line out of the footer entirely
   * rather than printing a label with nothing after it, so an organisation with
   * no public phone number simply has no phone line.
   */
  contact: {
    heading: string;
    address: string;
    phone: string;
    email: string;
    /** The small line over the message box. Blank hides it. */
    formHeading: string;
    /** One sentence under that heading. Blank hides it. */
    formNote: string;
  };
  socials: SocialLink[];
  /**
   * The footer's own copy.
   *
   * One line under the brand saying what this organisation is, for the reader
   * who arrived on a deck or an entry form and has never seen the home page.
   * Its own key rather than part of `brand`, because it appears in exactly one
   * place — the header and the splash screen have no room for a sentence.
   */
  footer: { blurb: string };
};

/**
 * The SHAPE of the document, with none of the words.
 *
 * This used to be DEFAULT_LANDING_CONTENT — the whole landing page as a literal,
 * rendered whenever the database had no row, which was always, because nothing
 * ever wrote one. The page is rows of `ctr.page_sections` now, seeded from
 * scripts/seed-data/landing.json, and the copy lives in exactly one place.
 *
 * What is left is the skeleton the normaliser merges over, so a stored document
 * missing a key gets an empty string rather than `undefined` reaching a renderer.
 * Nothing here is content and nothing here should ever gain any: a value in this
 * object is a word that would appear on the page without anybody having typed it.
 */
export const BLANK_LANDING_CONTENT: LandingContent = {
  brand: { name: "", subtitle: "", logo: "" },
  nav: { links: [], cta: { label: "", href: "" } },
  splash: { title: "", logo: "" },
  banners: [],
  about: {
    label: "",
    title: "",
    heading: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    // Two entries, not none. `aboutPhotos` maps over THIS array to decide how
    // many slots the layout has, so an empty one would render no photographs at
    // all however many are stored.
    photos: [
      { src: "", label: "" },
      { src: "", label: "" },
    ],
  },
  sportsSection: { label: "", title: "" },
  ctaBand: { label: "", title: "", body: "", ctaLabel: "", ctaHref: "" },
  contact: {
    heading: "",
    address: "",
    phone: "",
    email: "",
    formHeading: "",
    formNote: "",
  },
  footer: { blurb: "" },
  socials: [],
};

/* ─────────────────────────── Normalisation ─────────────────────────── */
/* The rules themselves live in src/lib/normalise.ts, shared with the INCRC
   document. Only what is specific to this page is below. */

export const MAX_SOCIALS = 8;

/**
 * What the contact block will hold.
 *
 * The address is the long one because it is several lines; the other two are
 * the lengths a phone number and an address can actually be. They are here
 * rather than inline so the admin's inputs and the normaliser cannot disagree
 * about where the text is cut.
 */
export const CONTACT_MAX = { address: 300, phone: 40, email: 200, formNote: 200 } as const;

/**
 * `tel:` and `mailto:` addresses for what somebody typed.
 *
 * A phone number is written for a human — "9500016999", "+91 95000 16999",
 * "044 2834 1234" — and a `tel:` link has to be the digits, so the two cannot
 * be the same string. Everything that is not a digit goes, except a leading
 * plus, which is the one piece of punctuation that changes what is dialled.
 *
 * Returns "" when there is nothing dialable left, and the footer then prints
 * the line as plain text rather than as a link to nowhere.
 */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `tel:${plus}${digits}` : "";
}

/** The same for an address, which is only a link if it looks like one. */
export function mailHref(email: string): string {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : "";
}
export const MAX_NAV_LINKS = 8;
/** The layout puts these either side of the about copy; a third has nowhere to go. */
export const ABOUT_PHOTO_COUNT = 2;

function navLinks(value: unknown, fallback: NavLink[]): NavLink[] {
  return list(
    value,
    MAX_NAV_LINKS,
    (entry) => ({ label: optionalText(entry.label), href: link(entry.href, "#top") }),
    fallback
    // A link with no words is invisible and unclickable — drop it rather than
    // render a gap in the nav.
  ).filter((entry) => entry.label !== "");
}

function socials(value: unknown, fallback: SocialLink[]): SocialLink[] {
  return list(
    value,
    MAX_SOCIALS,
    (entry) => ({
      label: optionalText(entry.label),
      href: link(entry.href, "#"),
      icon: oneOf(entry.icon, SOCIAL_ICONS, "website"),
    }),
    fallback
  ).filter((entry) => entry.label !== "");
}

/**
 * Banners replaced a single hardcoded "hero", and a document written before that
 * change has no `banners` key but does have `hero`. Rather than let the missing
 * key fall back to the defaults — silently throwing away copy someone wrote —
 * fold the old hero into one banner.
 *
 * Once saved from the admin the document has `banners` and this never runs
 * again. Delete it when no stored document still has a hero:
 *
 *   select key from ctr.content where content ? 'hero';
 */
function banners(root: Record<string, unknown>): Banner[] {
  if (root.banners !== undefined || !isRecord(root.hero)) {
    return normaliseBanners(root.banners, BLANK_LANDING_CONTENT.banners);
  }

  const hero = root.hero;

  return normaliseBanners(
    [
      {
        id: "banner-1",
        // Spotlight is the template the old hero's headline-and-photo layout
        // maps onto. The old hero also had a floating card of sports
        // (cardTitle/cardSubtitle/...); that card no longer exists on any
        // template, so those fields are simply not carried across.
        template: "spotlight",
        image: hero.background,
        title: hero.headline,
        subtitle: hero.proof,
        ctaLabel: hero.ctaLabel,
        ctaHref: hero.ctaHref,
      },
    ],
    BLANK_LANDING_CONTENT.banners
  );
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
 * Turns whatever came out of the `ctr.content` row into a valid LandingContent.
 *
 * Every field is merged over the defaults independently, so a document that is
 * partial, stale or outright malformed degrades one field at a time rather than
 * taking the landing page down. Runs on read as well as on write — the page
 * never trusts the stored shape.
 */
export function normaliseLandingContent(input: unknown): LandingContent {
  const d = BLANK_LANDING_CONTENT;
  const root = isRecord(input) ? input : {};

  const brand = isRecord(root.brand) ? root.brand : {};
  const nav = isRecord(root.nav) ? root.nav : {};
  const navCta = isRecord(nav.cta) ? nav.cta : {};
  const splash = isRecord(root.splash) ? root.splash : {};
  const about = isRecord(root.about) ? root.about : {};
  const sportsSection = isRecord(root.sportsSection) ? root.sportsSection : {};
  const ctaBand = isRecord(root.ctaBand) ? root.ctaBand : {};
  const contact = isRecord(root.contact) ? root.contact : {};
  const footer = isRecord(root.footer) ? root.footer : {};

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
    banners: banners(root),
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
    contact: {
      heading: text(contact.heading, d.contact.heading),
      // `text` keeps an empty string and only falls back on a MISSING or
      // wrong-typed field, which is what makes clearing a line a real editorial
      // choice here rather than a change that silently reverts on the next read.
      address: text(contact.address, d.contact.address, CONTACT_MAX.address),
      phone: text(contact.phone, d.contact.phone, CONTACT_MAX.phone),
      email: text(contact.email, d.contact.email, CONTACT_MAX.email),
      formHeading: text(contact.formHeading, d.contact.formHeading),
      formNote: text(contact.formNote, d.contact.formNote, CONTACT_MAX.formNote),
    },
    socials: socials(root.socials, d.socials),
    footer: { blurb: text(footer.blurb, d.footer.blurb, BODY_MAX) },
  };
}

/** Blank-line-separated copy becomes one paragraph per entry. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
