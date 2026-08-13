/**
 * Every word and picture on /incrc.
 *
 * The LIVE content is one JSONB document in `ctr_content` under the key 'incrc',
 * edited at /admin/incrc. What lives here is the TYPE plus the DEFAULTS, which:
 *
 *   1. render the page when the database is unreachable or has no row yet
 *   2. are the base every stored field is merged over, so a partial or malformed
 *      document degrades field by field rather than breaking the page
 *   3. are what the admin's "Load defaults" button restores
 *
 * The defaults are the championship's real copy, extracted from the older CTR
 * site's biography deck — the `incrc` block of its "CTR National Grid" chapter
 * plus its registration chapter. Everything there about CTR the team rather than
 * the championship was deliberately left behind: the origin story, the IRL and
 * F4 results, the karting league, the academy and the club belong on a CTR page.
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

import { INCRC_PHOTOS } from "@/config/images";
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

export type Partner = { name: string; logo: string };
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
 * `trackId` points at a row of ctr_tracks, which is where the map, the length
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
  /** ctr_tracks.id, or "" to fall back to the venue and city below. */
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
   * The heading only. The circuits themselves are rows of ctr_tracks — the
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

const ART = INCRC_PHOTOS.artwork;

export const DEFAULT_INCRC_CONTENT: IncrcContent = {
  meta: {
    name: "Indian National Car Racing Championship",
    short: "INCRC",
    tagline: "One Nation · One Championship",
    handle: "@incrc_",
    instagram: "https://www.instagram.com/incrc_",
  },

  banners: [
    {
      id: "incrc-banner-1",
      template: "spotlight",
      image: INCRC_PHOTOS.banners[0],
      ...BANNER_PICTURE_DEFAULTS,
      title: "One Nation.\nOne Championship.",
      subtitle: "India's biggest multi-category national car racing championship.",
      ctaLabel: "Register for 2026",
      ctaHref: "#register",
    },
    {
      id: "incrc-banner-2",
      template: "centre",
      image: INCRC_PHOTOS.banners[1],
      ...BANNER_PICTURE_DEFAULTS,
      title: "Seven categories. One grid.",
      subtitle: "Four national rounds on three of India's finest circuits.",
      ctaLabel: "See the calendar",
      ctaHref: "#calendar",
    },
    {
      id: "incrc-banner-3",
      template: "split",
      image: INCRC_PHOTOS.banners[2],
      ...BANNER_PICTURE_DEFAULTS,
      title: "CTR is not organising the future.\nCTR is building it.",
      subtitle: "Racing, live audiences, OTT broadcast and a fan ecosystem around every round.",
      ctaLabel: "Our vision",
      ctaHref: "#vision",
    },
  ],

  marquee: {
    items: [
      "2026 season · registration open",
      "Round 01 · Kari Motor Speedway · 11–13 September",
      "Seven racing categories",
      "Sanctioned by FMSCI",
      "Presented by CTR & JK Tyre",
      "Live on OTT",
    ],
  },

  intro: {
    kicker: "One Nation · One Championship",
    headline: "India's biggest multi-category national car racing championship",
    body: "A national motorsport ecosystem uniting seven racing categories under one championship.\n\nA complete experience — racing, live audiences, fan ecosystems, entertainment, OTT broadcast and sponsorship integration.",
    ctaLabel: "Register for 2026",
    ctaHref: "#register",
    partnersLabel: "Presented by",
    partners: [
      { name: "Chennai Turbo Riders", logo: ART.ctr },
      { name: "JK Tyre", logo: ART.jkTyre },
      { name: "FMSCI", logo: ART.fmsci },
    ],
  },

  stats: {
    items: [
      { value: "7", label: "Racing categories" },
      { value: "4", label: "Championship rounds" },
      { value: "3", label: "Iconic circuits" },
      { value: "2026", label: "Inaugural season" },
    ],
  },

  vision: {
    label: "Our vision",
    title: "A new era of Indian motorsport",
    items: [
      {
        icon: "star",
        label: "Elevate Indian motorsport",
        description:
          "Raise the standard of competitive racing across all categories on India's finest circuits.",
      },
      {
        icon: "rocket",
        label: "Inspire the next generation",
        description:
          "Nurture and develop the next wave of Indian racing champions from grassroots to national level.",
      },
      {
        icon: "shield",
        label: "Build a world-class ecosystem",
        description:
          "Create a self-sustaining motorsport infrastructure with safety, broadcast and fan engagement at its core.",
      },
      {
        icon: "globe",
        label: "Position India globally",
        description:
          "Establish India as a premier motorsport destination, attracting international talent and investment.",
      },
    ],
  },

  grid: {
    label: "The grid",
    heading: "A single grid for the whole country.",
    body: "Seven racing categories — from Formula 4 to saloons, hatchbacks and touring cars — line up together under one national banner, on India's finest circuits.",
    image: ART.circuit,
    imageAlt:
      "One Nation, One Championship — 3D render of the Kari Motor Speedway circuit, presented by CTR, JK Tyre and FMSCI.",
    caption: "Kari Motor Speedway · Coimbatore",
    inset: ART.cars,
    insetAlt:
      "The multi-category grid — Formula 4, saloon, hatchback and touring cars in CTR and JK Tyre livery.",
  },

  venues: {
    label: "Championship venues",
    title: "Three iconic circuits. One championship.",
  },

  calendar: {
    label: "FMSCI Indian National Car Racing Championship",
    title: "The 2026 Season",
    rounds: [
      {
        round: "01",
        start: "2026-09-11",
        end: "2026-09-13",
        dates: "",
        trackId: "",
        venue: "Kari Motor Speedway",
        city: "Coimbatore",
        status: "Entries open",
      },
      {
        round: "02",
        start: "2026-10-23",
        end: "2026-10-25",
        dates: "",
        trackId: "",
        venue: "Kari Motor Speedway",
        city: "Coimbatore",
        status: "Entries open",
      },
      {
        round: "03",
        start: "2026-11-13",
        end: "2026-11-15",
        dates: "",
        trackId: "",
        venue: "Bren Raceway",
        city: "Bengaluru",
        status: "Entries open",
      },
      {
        round: "04",
        start: "2026-12-11",
        end: "2026-12-13",
        dates: "",
        trackId: "",
        venue: "Madras International Circuit",
        city: "Chennai",
        status: "Season finale",
      },
    ],
  },

  partnership: {
    label: "Behind the grid",
    title: "A landmark partnership",
    body: "CTR, JK Tyre and FMSCI put pen to paper — bringing India's biggest multi-category national car racing championship to life.",
    // The establishing shot large on the left, the other two stacked beside it —
    // the arrangement this section has always drawn.
    layout: "three-hero-left",
    shots: [
      {
        image: ART.signing[0],
        alt: "CTR, JK Tyre and FMSCI officials signing the championship agreement.",
      },
      {
        image: ART.signing[1],
        alt: "CTR and JK Tyre representatives sealing the partnership with a handshake.",
      },
      {
        image: ART.signing[2],
        alt: "The CTR, JK Tyre and FMSCI leadership with the signed championship agreement.",
      },
    ],
  },

  family: {
    image: ART.family,
    lead: "Entertainment isn't created by one organiser.",
    quote: "It is powered by an entire motorsport family.",
    showFlag: true,
    links: [
      {
        id: "family-link-1",
        icon: "instagram",
        label: "Follow the championship",
        note: "@incrc_",
        href: "https://www.instagram.com/incrc_",
      },
    ],
  },

  rows: {
    label: "Championship bulletin",
    title: "The latest from the paddock",
    items: [
      {
        id: "row-1",
        label: "Entries",
        title: "2026 driver registration is open across all seven categories",
        meta: "Closes 15 August",
        href: "#register",
      },
      {
        id: "row-2",
        label: "Calendar",
        title: "Round 01 confirmed for Kari Motor Speedway, 11–13 September",
        meta: "Coimbatore",
        href: "#calendar",
      },
      {
        id: "row-3",
        label: "Partnership",
        title: "CTR, JK Tyre and FMSCI sign the championship into existence",
        meta: "Announcement",
        href: "#partnership",
      },
      {
        id: "row-4",
        label: "Broadcast",
        title: "Every round to be carried live on OTT with full onboard coverage",
        meta: "2026 season",
        href: "#vision",
      },
    ],
  },

  posts: {
    label: "Newsroom",
    title: "Stories from the championship",
    ctaLabel: "Follow the championship",
    ctaHref: "https://www.instagram.com/incrc_",
    items: [
      {
        id: "post-1",
        image: INCRC_PHOTOS.posts[0],
        category: "Championship",
        date: "August 2026",
        title: "Seven categories, one national banner",
        excerpt:
          "How a single grid brings Formula 4, saloons, hatchbacks and touring cars to the same race weekend.",
        href: "#grid",
      },
      {
        id: "post-2",
        image: INCRC_PHOTOS.posts[1],
        category: "Circuits",
        date: "August 2026",
        title: "Three circuits that will decide the title",
        excerpt:
          "Kari, Bren and Madras — the layouts, the corners that matter and what each asks of a driver.",
        href: "#venues",
      },
      {
        id: "post-3",
        image: INCRC_PHOTOS.posts[2],
        category: "Paddock",
        date: "July 2026",
        title: "Inside the partnership that built INCRC",
        excerpt:
          "CTR, JK Tyre and FMSCI on why Indian motorsport needed one championship rather than many.",
        href: "#partnership",
      },
    ],
  },

  register: {
    kicker: "2026 season · registration open",
    title: "Race with CTR",
    // The source deck said "Eight categories" here while the championship's own
    // figures say seven, in two separate places. Seven is the number used.
    body: "Seven categories. Four national rounds on India's best circuits. Whether it is your first race or your next championship, there is a grid here for you.",
    ctaLabel: "Register now",
    // Entry forms are on this site now — see src/lib/forms.ts — so the default
    // points at the section listing them rather than off to the older CTR site.
    // A default cannot name a form's address, because it cannot know that any
    // form exists; the picker in the admin is how this is aimed at one.
    ctaHref: "#registrations",
  },

  registrations: {
    label: "Enter the championship",
    title: "Registration",
    body: "Pick the one you are entering. Everything below is taken on this site — no forms to print, no email to chase.",
    showClosed: true,
  },

  /*
   * Empty on purpose, and the section renders nothing while it is.
   *
   * There is no honest default here: a card names a deck by its address, and a
   * fresh install has no decks. Copy with no cards under it would be a heading
   * over a blank strip on a live page — this id was appended to
   * INCRC_SECTION_IDS, which switches it ON for every stored document.
   */
  decks: {
    label: "Read more",
    title: "Documents and decks",
    body: "",
    items: [],
  },

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
 * Turns whatever came out of the `ctr_content` row into a valid IncrcContent.
 *
 * Every field is merged over the defaults independently, so a document that is
 * partial, stale or outright malformed degrades one field at a time rather than
 * taking the page down. Runs on read as well as on write — the page never trusts
 * the stored shape.
 */
export function normaliseIncrcContent(input: unknown): IncrcContent {
  const d = DEFAULT_INCRC_CONTENT;
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
          logo: image(entry.logo, ART.ctr),
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

    // Heading only. A document saved before the circuits moved to ctr_tracks
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
          image: image(entry.image, ART.signing[0]),
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
            image: image(entry.image, INCRC_PHOTOS.posts[0]),
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
