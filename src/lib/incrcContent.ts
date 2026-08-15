/**
 * Every word and picture on /incrc.
 *
 * The LIVE content is rows of `ctr.page_sections` plus the four tables promoted
 * out of it, assembled back into one document by `readPage` and edited at
 * /console/incrc. What lives here is the TYPE plus BLANK_INCRC_CONTENT — the
 * shape with none of the words — which is the base every stored field is merged
 * over, so a partial or malformed document degrades field by field rather than
 * breaking the page.
 *
 * The championship's real copy — extracted from the older CTR site's biography
 * deck, the `incrc` block of its "CTR National Grid" chapter plus its
 * registration chapter — used to be a DEFAULTS constant in this file, rendered
 * whenever the database had no row. It always had no row. That copy is now
 * scripts/seed-data/incrc.json, written into the tables by `npm run db:seed`,
 * and a database that cannot be read renders the error boundary rather than a
 * repo-held replica of the championship.
 *
 * What was deliberately left behind when that copy was extracted still is:
 * everything about CTR the team rather than the championship — the origin story,
 * the IRL and F4 results, the karting league, the academy and the club.
 *
 * `sections` is what makes the page assemblable: it is the running order, and
 * each entry can be switched off. The page renders that list, so a section that
 * is off is not on the page at all — not hidden with CSS.
 *
 * The header, the navigation and the footer are NOT here. They come from the
 * landing document, so the chrome around this page stays in step with the home
 * page when either is edited.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { PLACEHOLDER_PHOTO } from "@/config/images";
import { BANNER_PICTURE_DEFAULTS, normaliseBanners, type Banner } from "@/lib/banners";
import {
  COLLAGE_LAYOUT_IDS,
  MAX_COLLAGE_CELLS,
  defaultLayoutFor,
  type CollageLayoutId,
} from "@/lib/collage";
import {
  BODY_MAX,
  bool,
  image,
  isRecord,
  isoDate,
  lines,
  link,
  list,
  oneOf,
  optionalText,
  text,
} from "@/lib/normalise";
import { isUsableSlug } from "@/lib/slug";

/* ────────────────────────────── Sections ────────────────────────────── */

/**
 * Every section the page can render, in the order a new document gets them.
 *
 * The banners are not in this list: they carry the site header laid over them,
 * so they are always the first thing on the page. Emptying the banner list is
 * what removes the carousel, and the header then renders on its own bar.
 *
 * Adding a section is: an id here, a `case` in the page's renderer, a panel in
 * the admin, and a line in the admin's own section list. Removing one is safe —
 * a stored document holding the retired id simply drops it.
 */
export const INCRC_SECTION_IDS = [
  "marquee",
  "intro",
  "stats",
  "vision",
  "grid",
  "venues",
  "calendar",
  "partnership",
  "family",
  "rows",
  "posts",
  "register",
  "registrations",
  "decks",
] as const;

export type IncrcSectionId = (typeof INCRC_SECTION_IDS)[number];

/** One line of the running order. */
export type SectionState = { id: IncrcSectionId; visible: boolean };

/* ─────────────────────────────── Pieces ─────────────────────────────── */

export const VISION_ICONS = ["star", "rocket", "shield", "globe", "flag", "spark"] as const;
export type VisionIcon = (typeof VISION_ICONS)[number];

/**
 * The glyphs a link chip can wear.
 *
 * Six marks and four plain ones, because a chip is recognised by its logo
 * before it is read: an Instagram chip is spotted, a chip saying "Instagram" is
 * read. The plain four are for everything that is not a network — a site, an
 * address, a number, or anywhere else worth sending someone.
 *
 * Drawn in LINK_GLYPHS, in the page's own components. Retiring one is safe: a
 * stored chip asking for it reads back as `globe`.
 */
export const LINK_ICONS = [
  "instagram",
  "facebook",
  "youtube",
  "x",
  "linkedin",
  "whatsapp",
  "globe",
  "mail",
  "phone",
  "arrow",
] as const;
export type LinkIcon = (typeof LINK_ICONS)[number];

/**
 * One chip: a glyph, what it says, and where it goes.
 *
 * `note` is the tail printed in the accent after the label — a handle, a
 * number, a city. Blank prints nothing, which is what most chips want.
 */
export type LinkChip = {
  id: string;
  icon: LinkIcon;
  label: string;
  note: string;
  href: string;
};

/**
 * One mark in the panel beside the introduction.
 *
 * `href` is optional and usually blank. A mark with one becomes a link to
 * wherever that partner should be sent — their own site, a page here, a section
 * of this one; a mark without one is a picture, which is what a sanctioning
 * body's crest normally wants to be. `name` is the alt text either way, so the
 * mark says who it is whether or not it goes anywhere.
 */
export type Partner = { name: string; logo: string; href: string };
export type Stat = { value: string; label: string };
export type VisionItem = { icon: VisionIcon; label: string; description: string };
/**
 * One weekend of the season.
 *
 * Two ways of saying when, on purpose. `start`/`end` are real dates (ISO
 * `YYYY-MM-DD`) and are what the countdown counts to; `dates` is the line the
 * card prints. Leave `dates` blank and the range is written from the two dates,
 * which is what you want almost always — fill it in when the weekend has a name
 * the dates cannot express ("TBA", "Provisional, October").
 *
 * A round with no `start` simply has no countdown. That is the honest rendering
 * of a date nobody has fixed yet, and it is why the dates are not required.
 *
 * `trackId` points at a row of ctr.tracks, which is where the map, the length
 * and the corner count live. `venue`/`city` are the fallback for a round whose
 * circuit has no row yet — and the reason the old content still reads correctly.
 */
export type Round = {
  round: string;
  /** ISO `YYYY-MM-DD`, or "" when the weekend is not fixed. */
  start: string;
  /** ISO `YYYY-MM-DD`. Blank means a one-day round: the same as `start`. */
  end: string;
  /** Overrides the printed date range. Blank writes it from start/end. */
  dates: string;
  /** ctr.tracks.id, or "" to fall back to the venue and city below. */
  trackId: string;
  venue: string;
  city: string;
  status: string;
};
export type Shot = { image: string; alt: string };
/**
 * One card pointing at a deck.
 *
 * `slug` is the deck's address and the only part that is a reference — the same
 * choice `Round.trackId` makes, and for the same reason: this document is
 * normalised in the BROWSER as well as on the server, where nothing can be
 * looked up. The renderer resolves it against the decks it was handed, and a
 * card whose deck has gone is dropped rather than drawn as a dead link.
 *
 * `title` and `blurb` are OVERRIDES, blank almost always. The card shows the
 * deck's own name and line, so renaming a deck corrects every page pointing at
 * it — these are for the page that needs to call it something else in context.
 */
export type DeckCard = { slug: string; title: string; blurb: string };
export type RowItem = { id: string; label: string; title: string; meta: string; href: string };
export type Post = {
  id: string;
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
};

export type IncrcContent = {
  /**
   * Identity — used by the page title, the JSON-LD and the follow button.
   *
   * Not a section of its own. It is edited under the introduction, which is the
   * section that names the championship and carries the first follow button.
   */
  meta: {
    name: string;
    short: string;
    tagline: string;
    handle: string;
    instagram: string;
  };
  /** The rotating panels at the top. Modelled in src/lib/banners.ts. */
  banners: Banner[];
  marquee: { items: string[] };
  intro: {
    kicker: string;
    headline: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    partnersLabel: string;
    partners: Partner[];
  };
  stats: { items: Stat[] };
  vision: { label: string; title: string; items: VisionItem[] };
  grid: {
    label: string;
    heading: string;
    body: string;
    image: string;
    imageAlt: string;
    caption: string;
    inset: string;
    insetAlt: string;
  };
  /**
   * The heading only. The circuits themselves are rows of ctr.tracks — the
   * section shows the first three and sends the reader to /circuits for the
   * rest — so there is nothing about a venue to type in here.
   */
  venues: { label: string; title: string };
  calendar: { label: string; title: string; rounds: Round[] };
  partnership: {
    label: string;
    title: string;
    body: string;
    /** Which arrangement the photographs are laid out in. See src/lib/collage.ts. */
    layout: CollageLayoutId;
    /** Cell order: the first is the first cell of the layout. */
    shots: Shot[];
  };
  family: {
    image: string;
    lead: string;
    quote: string;
    showFlag: boolean;
    /** The chips under the quote. Empty leaves the quote on its own. */
    links: LinkChip[];
  };
  rows: { label: string; title: string; items: RowItem[] };
  posts: { label: string; title: string; ctaLabel: string; ctaHref: string; items: Post[] };
  register: { kicker: string; title: string; body: string; ctaLabel: string; ctaHref: string };
  /**
   * The heading over the entry forms. WHICH forms appear is not here: the
   * section shows every published form assigned to this page, in the order the
   * registrations screen puts them in. See RegistrationsSection.
   */
  registrations: { label: string; title: string; body: string; showClosed: boolean };
  /**
   * Cards pointing at decks — the picked ones, unlike the entry forms above.
   *
   * The difference is deliberate. Every published form for this page belongs on
   * this page, so that section takes the lot. A deck belongs to nobody: the
   * same screen holds the entry pack this page wants and the sponsorship deck it
   * does not, so which ones appear here is an editorial choice and is stored.
   */
  decks: { label: string; title: string; body: string; items: DeckCard[] };
  sections: SectionState[];
};

/* ────────────────────────────── Defaults ────────────────────────────── */

/**
 * The SHAPE of the document, with none of the words. See the note on
 * BLANK_LANDING_CONTENT — this is the same change, for the larger page.
 *
 * The championship's copy is rows of `ctr.page_sections` now, seeded from
 * scripts/seed-data/incrc.json. Nothing here is content.
 */
export const BLANK_INCRC_CONTENT: IncrcContent = {
  meta: { name: "", short: "", tagline: "", handle: "", instagram: "" },
  banners: [],
  marquee: { items: [] },
  intro: {
    kicker: "",
    headline: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    partnersLabel: "",
    partners: [],
  },
  stats: { items: [] },
  vision: { label: "", title: "", items: [] },
  grid: {
    label: "",
    heading: "",
    body: "",
    image: "",
    imageAlt: "",
    caption: "",
    inset: "",
    insetAlt: "",
  },
  venues: { label: "", title: "" },
  calendar: { label: "", title: "", rounds: [] },
  partnership: {
    label: "",
    title: "",
    body: "",
    // A real id rather than "": the field is typed to the set, and the
    // normaliser picks its own from the photograph count regardless.
    layout: "one",
    shots: [],
  },
  family: { image: "", lead: "", quote: "", showFlag: true, links: [] },
  rows: { label: "", title: "", items: [] },
  posts: { label: "", title: "", ctaLabel: "", ctaHref: "", items: [] },
  register: { kicker: "", title: "", body: "", ctaLabel: "", ctaHref: "" },
  registrations: { label: "", title: "", body: "", showClosed: true },
  decks: { label: "", title: "", body: "", items: [] },
  sections: INCRC_SECTION_IDS.map((id) => ({ id, visible: true })),
};

/* ─────────────────────────────── Limits ─────────────────────────────── */

export const MAX_MARQUEE_ITEMS = 10;
export const MAX_PARTNERS = 6;
export const MAX_STATS = 6;
export const MAX_VISION = 6;
export const MAX_ROUNDS = 12;
/** The most cells any collage arrangement has — see src/lib/collage.ts. */
export const MAX_SHOTS = MAX_COLLAGE_CELLS;
/** A row of chips under a quote. More than four wraps into a list. */
export const MAX_FAMILY_LINKS = 4;
export const MAX_ROWS = 12;
export const MAX_POSTS = 9;
/** Cards pointing at decks. Past a dozen this is an index, not a band. */
export const MAX_DECK_CARDS = 12;

/* ─────────────────────────── Normalisation ─────────────────────────── */

/**
 * A deck's address, or "".
 *
 * The same rule the decks table itself enforces, applied to the reference: a
 * card holding anything that is not a usable slug names no deck, and the
 * section drops it rather than rendering a link to `/deck/undefined`. Nothing
 * here checks that the deck EXISTS — this runs in the browser too, where there
 * is nothing to ask; the renderer resolves it against the decks it was handed.
 */
function deckSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  return isUsableSlug(trimmed) ? trimmed : "";
}

/**
 * The running order.
 *
 * Always every known section exactly once. A stored list that is missing one —
 * because it was saved before that section existed — gets it appended, switched
 * ON, so a new section shows up rather than silently never appearing. A stored
 * id that no longer exists is dropped, which is what makes retiring a section a
 * code change and nothing else.
 */
function sections(value: unknown): SectionState[] {
  const stored = Array.isArray(value) ? value.filter(isRecord) : [];
  const seen = new Set<IncrcSectionId>();
  const order: SectionState[] = [];

  for (const entry of stored) {
    const id = entry.id;
    if (!isSectionId(id) || seen.has(id)) continue;
    seen.add(id);
    order.push({ id, visible: bool(entry.visible, true) });
  }

  for (const id of INCRC_SECTION_IDS) {
    if (!seen.has(id)) order.push({ id, visible: true });
  }

  return order;
}

function isSectionId(value: unknown): value is IncrcSectionId {
  return (INCRC_SECTION_IDS as readonly string[]).includes(value as string);
}

/** Ids only have to be unique inside one list; duplicates would break React keys. */
function withIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen = new Set<string>();
  return items.map((item, index) => {
    const id = item.id && !seen.has(item.id) ? item.id : `${prefix}-${index + 1}-${seen.size}`;
    seen.add(id);
    return { ...item, id };
  });
}

/**
 * Turns whatever came out of the `ctr.content` row into a valid IncrcContent.
 *
 * Every field is merged over the defaults independently, so a document that is
 * partial, stale or outright malformed degrades one field at a time rather than
 * taking the page down. Runs on read as well as on write — the page never trusts
 * the stored shape.
 */
export function normaliseIncrcContent(input: unknown): IncrcContent {
  const d = BLANK_INCRC_CONTENT;
  const root = isRecord(input) ? input : {};

  const meta = isRecord(root.meta) ? root.meta : {};
  const marquee = isRecord(root.marquee) ? root.marquee : {};
  const intro = isRecord(root.intro) ? root.intro : {};
  const stats = isRecord(root.stats) ? root.stats : {};
  const vision = isRecord(root.vision) ? root.vision : {};
  const grid = isRecord(root.grid) ? root.grid : {};
  const venues = isRecord(root.venues) ? root.venues : {};
  const calendar = isRecord(root.calendar) ? root.calendar : {};
  const partnership = isRecord(root.partnership) ? root.partnership : {};
  const family = isRecord(root.family) ? root.family : {};
  const rows = isRecord(root.rows) ? root.rows : {};
  const posts = isRecord(root.posts) ? root.posts : {};
  const register = isRecord(root.register) ? root.register : {};
  const registrations = isRecord(root.registrations) ? root.registrations : {};
  const decks = isRecord(root.decks) ? root.decks : {};

  // Read before the rest, because the family band's chips fall back to it:
  // that band used to draw one fixed Instagram button from these two fields,
  // so a document saved before the chips existed has to come back with that
  // same button rather than the built-in default's address.
  const identity = {
    name: text(meta.name, d.meta.name),
    short: text(meta.short, d.meta.short),
    tagline: text(meta.tagline, d.meta.tagline),
    handle: text(meta.handle, d.meta.handle),
    instagram: link(meta.instagram, d.meta.instagram),
  };

  return {
    meta: identity,

    banners: normaliseBanners(root.banners, d.banners),

    marquee: { items: lines(marquee.items, MAX_MARQUEE_ITEMS, d.marquee.items) },

    intro: {
      kicker: text(intro.kicker, d.intro.kicker),
      headline: text(intro.headline, d.intro.headline),
      body: text(intro.body, d.intro.body, BODY_MAX),
      ctaLabel: text(intro.ctaLabel, d.intro.ctaLabel),
      ctaHref: link(intro.ctaHref, d.intro.ctaHref),
      partnersLabel: text(intro.partnersLabel, d.intro.partnersLabel),
      partners: list(
        intro.partners,
        MAX_PARTNERS,
        (entry) => ({
          name: optionalText(entry.name),
          logo: image(entry.logo, PLACEHOLDER_PHOTO),
          // "" rather than a fallback address: a mark saved before marks could
          // be linked has no href, and the honest reading of that is a picture
          // that goes nowhere — not one silently pointed at somebody else's
          // link. `link` also refuses anything that is not http(s), a path or
          // an anchor, which is what keeps a `javascript:` payload out of the
          // <a href> this ends up in.
          href: link(entry.href, ""),
        }),
        d.intro.partners
      ),
    },

    stats: {
      items: list(
        stats.items,
        MAX_STATS,
        (entry) => ({ value: optionalText(entry.value, 12), label: optionalText(entry.label) }),
        d.stats.items
      ),
    },

    vision: {
      label: text(vision.label, d.vision.label),
      title: text(vision.title, d.vision.title),
      items: list(
        vision.items,
        MAX_VISION,
        (entry) => ({
          icon: oneOf(entry.icon, VISION_ICONS, "star"),
          label: optionalText(entry.label),
          description: optionalText(entry.description, BODY_MAX),
        }),
        d.vision.items
      ),
    },

    grid: {
      label: text(grid.label, d.grid.label),
      heading: text(grid.heading, d.grid.heading),
      body: text(grid.body, d.grid.body, BODY_MAX),
      image: image(grid.image, d.grid.image),
      imageAlt: text(grid.imageAlt, d.grid.imageAlt),
      caption: text(grid.caption, d.grid.caption),
      inset: image(grid.inset, d.grid.inset),
      insetAlt: text(grid.insetAlt, d.grid.insetAlt),
    },

    // Heading only. A document saved before the circuits moved to ctr.tracks
    // still carries its `items`; they are dropped here, which is what retires
    // the field — the section reads the tracks table instead.
    venues: {
      label: text(venues.label, d.venues.label),
      title: text(venues.title, d.venues.title),
    },

    calendar: {
      label: text(calendar.label, d.calendar.label),
      title: text(calendar.title, d.calendar.title),
      rounds: list(
        calendar.rounds,
        MAX_ROUNDS,
        (entry) => ({
          round: optionalText(entry.round, 8),
          start: isoDate(entry.start),
          end: isoDate(entry.end),
          dates: optionalText(entry.dates),
          // Not checked against the tracks table: this runs in the browser too,
          // and a round pointing at a deleted circuit already falls back to the
          // venue text. A dangling id costs nothing; a database round-trip in a
          // normaliser costs a great deal.
          trackId: optionalText(entry.trackId, 40),
          venue: optionalText(entry.venue),
          city: optionalText(entry.city),
          status: optionalText(entry.status, 40),
        }),
        d.calendar.rounds
      ),
    },

    partnership: (() => {
      const shots = list(
        partnership.shots,
        MAX_SHOTS,
        (entry) => ({
          image: image(entry.image, PLACEHOLDER_PHOTO),
          alt: optionalText(entry.alt),
        }),
        d.partnership.shots
      );

      return {
        label: text(partnership.label, d.partnership.label),
        title: text(partnership.title, d.partnership.title),
        body: text(partnership.body, d.partnership.body, BODY_MAX),
        // Kept as stored even when it no longer fits the number of photographs:
        // `resolveCollage` draws the right one for the count either way, and
        // leaving the id alone is what lets a photograph be removed and put
        // back without quietly losing the choice. An id from a retired
        // arrangement falls back to the default for however many there are.
        layout: oneOf(partnership.layout, COLLAGE_LAYOUT_IDS, defaultLayoutFor(shots.length)),
        shots,
      };
    })(),

    family: {
      image: image(family.image, d.family.image),
      lead: text(family.lead, d.family.lead),
      quote: text(family.quote, d.family.quote, BODY_MAX),
      showFlag: bool(family.showFlag, d.family.showFlag),
      links: withIds(
        list(
          family.links,
          MAX_FAMILY_LINKS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            icon: oneOf(entry.icon, LINK_ICONS, "globe"),
            label: optionalText(entry.label, 60),
            note: optionalText(entry.note, 40),
            href: link(entry.href, "#"),
          }),
          // No stored list at all is a document from before the chips: it gets
          // the follow button it used to draw, pointed where it used to point.
          [
            {
              id: "family-link-1",
              icon: "instagram" as LinkIcon,
              label: d.family.links[0].label,
              note: identity.handle,
              href: identity.instagram,
            },
          ]
        ),
        "family-link"
      ),
    },

    rows: {
      label: text(rows.label, d.rows.label),
      title: text(rows.title, d.rows.title),
      items: withIds(
        list(
          rows.items,
          MAX_ROWS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            label: optionalText(entry.label, 40),
            title: optionalText(entry.title, BODY_MAX),
            meta: optionalText(entry.meta, 60),
            href: link(entry.href, "#"),
          }),
          d.rows.items
        ),
        "row"
      ),
    },

    posts: {
      label: text(posts.label, d.posts.label),
      title: text(posts.title, d.posts.title),
      ctaLabel: text(posts.ctaLabel, d.posts.ctaLabel),
      ctaHref: link(posts.ctaHref, d.posts.ctaHref),
      items: withIds(
        list(
          posts.items,
          MAX_POSTS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            image: image(entry.image, PLACEHOLDER_PHOTO),
            category: optionalText(entry.category, 40),
            date: optionalText(entry.date, 40),
            title: optionalText(entry.title, BODY_MAX),
            excerpt: optionalText(entry.excerpt, BODY_MAX),
            href: link(entry.href, "#"),
          }),
          d.posts.items
        ),
        "post"
      ),
    },

    register: {
      kicker: text(register.kicker, d.register.kicker),
      title: text(register.title, d.register.title),
      body: text(register.body, d.register.body, BODY_MAX),
      ctaLabel: text(register.ctaLabel, d.register.ctaLabel),
      ctaHref: link(register.ctaHref, d.register.ctaHref),
    },

    registrations: {
      label: text(registrations.label, d.registrations.label),
      title: text(registrations.title, d.registrations.title),
      body: text(registrations.body, d.registrations.body, BODY_MAX),
      showClosed: bool(registrations.showClosed, d.registrations.showClosed),
    },

    decks: {
      label: text(decks.label, d.decks.label),
      title: text(decks.title, d.decks.title),
      body: text(decks.body, d.decks.body, BODY_MAX),
      items: list<DeckCard>(
        decks.items,
        MAX_DECK_CARDS,
        (entry) => ({
          // The slug and nothing else is the reference, so it goes through the
          // same shape test the address itself has to pass. A card carrying
          // anything else names no deck, and the section drops it.
          slug: deckSlug(entry.slug),
          title: optionalText(entry.title),
          blurb: optionalText(entry.blurb, BODY_MAX),
        }),
        d.decks.items
      ),
    },

    sections: sections(root.sections),
  };
}
