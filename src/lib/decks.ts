/**
 * A deck: a run of images at an address of its own.
 *
 * The thing this exists for is the document that arrives as pictures — a rules
 * pack, an entry brief, a sponsorship proposal, a scanned circuit map — where
 * every page is a JPEG and the only sensible way to read it is top to bottom,
 * in order, with nothing in between. There is no layout to choose and no copy to
 * write around it: a deck IS its pages.
 *
 * ── Why it is a row and not a section ─────────────────────────────────────
 *
 * Every other picture on this site belongs to a section of a page, and moving
 * one means editing that page's document. A deck belongs to nobody. It is
 * published at `/deck/<slug>` whether or not anything links to it, which is what
 * makes it something you can put on a poster, hand to a partner, or point three
 * different pages at without copying it three times.
 *
 * That is also why the address is a stored column and not derived from the
 * name: the address outlives the name. Renaming a deck pushes the old address
 * into `former_slugs` and the public page permanently redirects it, exactly as a
 * registration form does — a printed link corrects itself rather than dying.
 *
 * ── What a page is ────────────────────────────────────────────────────────
 *
 * A URL and its alt text, and nothing else. No per-page caption, no width, no
 * layout: the moment a page carries its own arrangement this stops being a deck
 * and starts being a page builder, and there is one of those already.
 *
 * A page's identity is its POSITION in the list. Nothing stores a page number,
 * because a number typed on each of fifty of them can be duplicated, skipped or
 * left pointing past the end, and none of that can happen to a position — the
 * same reasoning the collage layouts are built on.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { URL_MAX, image, isRecord, lines, oneOf, optionalText } from "@/lib/normalise";
import { SLUG_MAX, fallbackSlug, isUsableSlug, slugify, usableSlug } from "@/lib/slug";

/* ─────────────────────────────── Shape ──────────────────────────────── */

/**
 * Draft or published, and nothing in between.
 *
 * A form has a third state — open, closed, scheduled — because it takes
 * something from a visitor and there is a moment when it stops. A deck only
 * shows; there is no equivalent of "closed", so there is no third word here to
 * pretend otherwise.
 */
export const DECK_STATUSES = ["draft", "published"] as const;
export type DeckStatus = (typeof DECK_STATUSES)[number];

export const DECK_STATUS_LABELS: Record<DeckStatus, string> = {
  draft: "Draft",
  published: "Published",
};

/**
 * The most pages one deck may hold.
 *
 * Fifty is the number the deck was asked for, and it is also about the point
 * where a single scrolling page stops being the right shape for the thing —
 * past that it wants a contents list, which is a different feature. The limit is
 * enforced on the way in as well as in the editor, so a hand-written request
 * cannot store two hundred.
 */
export const MAX_DECK_PAGES = 50;

export const DECK_LIMITS = {
  name: 120,
  slug: SLUG_MAX,
  blurb: 240,
  /** Alt text. Long enough for a real sentence, short enough not to be a caption. */
  alt: 200,
  url: URL_MAX,
} as const;

/** One image in the run. Its position in the list is its page number. */
export type DeckPage = {
  url: string;
  /** What it says, for anyone who cannot see it. Blank falls back — see `pageAlt`. */
  alt: string;
};

export type Deck = {
  id: string;
  name: string;
  /** The address. `/deck/<slug>`. */
  slug: string;
  status: DeckStatus;
  /** The line under the heading, and what a card linking to it says. */
  blurb: string;
  /**
   * Whether the deck's own name is printed above the images.
   *
   * Off is a real choice and not a nicety: a scanned document whose first page
   * is already a cover has the title on it, and printing the name above that is
   * saying it twice.
   */
  show_heading: boolean;
  pages: DeckPage[];
  /** Addresses it used to answer to. The public page redirects from these. */
  former_slugs: string[];
  sort_order: number;
};

/** What a deck is when it is made. The editor fills it in from there. */
export const BLANK_DECK: Omit<Deck, "id"> = {
  name: "",
  slug: "",
  status: "draft",
  blurb: "",
  show_heading: true,
  pages: [],
  former_slugs: [],
  sort_order: 0,
};

export function blankDeckPage(): DeckPage {
  return { url: "", alt: "" };
}

/**
 * A deck reduced to what a LIST of decks needs.
 *
 * The picker, the cards on /incrc and the admin's own rail all want the same
 * five things and none of them wants fifty URLs. Sending the whole row would put
 * every image address of every deck into the admin's page payload, where the
 * only use for them is a cover.
 */
export type DeckSummary = {
  id: string;
  name: string;
  slug: string;
  status: DeckStatus;
  blurb: string;
  /** The first page, for a card. "" when the deck has no pages yet. */
  cover: string;
  /** How many pages it holds. */
  pages: number;
};

export function summariseDeck(deck: Deck): DeckSummary {
  return {
    id: deck.id,
    name: deck.name,
    slug: deck.slug,
    status: deck.status,
    blurb: deck.blurb,
    cover: deck.pages[0]?.url ?? "",
    pages: deck.pages.length,
  };
}

/* ────────────────────────────── Addresses ───────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as the circuits and the forms: a malformed id should 404. */
export function isDeckId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function deckHref(deck: Pick<Deck, "slug">): string {
  return `/deck/${deck.slug}`;
}

/** The slug in a stored `/deck/<slug>` link, or "" if it is not one. */
export function slugFromDeckHref(href: string): string {
  const match = /^\/deck\/([a-z0-9][a-z0-9-]*)$/.exec(href.trim());
  return match ? match[1] : "";
}

/* ──────────────────────────── Normalisation ─────────────────────────── */

/**
 * What one page of a deck reads back as.
 *
 * A page with no usable image is dropped rather than kept as a hole: an empty
 * `src` renders as a broken image, and a deck is nothing but images, so a broken
 * one is a broken page. That does mean a row added in the editor and left blank
 * disappears on save — which is what the note under the list says, and is
 * better than publishing a gap nobody notices until a visitor does.
 *
 * The cap is applied AFTER the blanks are dropped, so a list with empty rows
 * scattered through it does not lose real pages off the end.
 */
export function normaliseDeckPages(value: unknown): DeckPage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((entry) => ({
      url: image(entry.url, ""),
      alt: optionalText(entry.alt, DECK_LIMITS.alt),
    }))
    .filter((page) => page.url !== "")
    .slice(0, MAX_DECK_PAGES);
}

/**
 * What a page's alt text is, given it may not have any.
 *
 * Fifty images each announced as "image" is worse than useless to a screen
 * reader, and asking somebody to write fifty sentences before they can publish a
 * scanned document is how the feature goes unused. So the fallback says the one
 * true thing that is always available: which page of what this is.
 */
export function pageAlt(deck: Pick<Deck, "name">, page: DeckPage, index: number): string {
  if (page.alt) return page.alt;
  return deck.name ? `${deck.name} — page ${index + 1}` : `Page ${index + 1}`;
}

/**
 * Everything stored, read through its rules.
 *
 * Runs on the way in and on the way out, like every other document here: a row
 * written by an older version, or half-edited, degrades one field at a time
 * rather than taking the page down.
 *
 * `notes` collects anything that had to be CHANGED, so the editor can say so.
 * An address quietly rewritten behind a "Saved" badge is how somebody's printed
 * link stops working without anybody noticing.
 */
export function normaliseDeckInput(input: unknown, notes?: string[]): Omit<Deck, "id"> {
  const record = isRecord(input) ? input : {};

  const name = optionalText(record.name, DECK_LIMITS.name);
  const typed = optionalText(record.slug, DECK_LIMITS.slug).toLowerCase();
  /*
   * The typed address, then a TIDIED version of it, and only then the name.
   *
   * The middle step matters: without it, typing "Entry Pack!" on a deck called
   * "Pack" threw the typed address away entirely and published at `pack`, while
   * the note underneath said it had been "tidied up" — which is what somebody
   * reads when their poster stops working. Somebody who typed an address meant
   * that address; the name is the fallback for having typed none.
   */
  const slug =
    usableSlug(typed) || usableSlug(slugify(typed)) || usableSlug(slugify(name)) || fallbackSlug("deck");

  if (typed && slug !== typed) {
    notes?.push(`The address was tidied up to “${slug}”.`);
  }

  const pages = normaliseDeckPages(record.pages);
  const sent = Array.isArray(record.pages) ? record.pages.length : 0;

  if (sent > pages.length) {
    const lost = sent - pages.length;
    notes?.push(
      lost === 1
        ? "One page had no picture on it and was dropped."
        : `${lost} pages had no picture on them and were dropped.`
    );
  }

  return {
    name,
    slug,
    status: oneOf(record.status, DECK_STATUSES, "draft"),
    blurb: optionalText(record.blurb, DECK_LIMITS.blurb),
    show_heading: typeof record.show_heading === "boolean" ? record.show_heading : true,
    pages,
    // Every address it has ever answered to, minus the one it answers to now —
    // keeping the current slug in the list would make the redirect a loop.
    former_slugs: lines(record.former_slugs, 20, [])
      .map((entry) => entry.toLowerCase())
      .filter((entry) => isUsableSlug(entry) && entry !== slug),
    sort_order: typeof record.sort_order === "number" ? record.sort_order : 0,
  };
}
