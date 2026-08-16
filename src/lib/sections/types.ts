/**
 * What a section module is.
 *
 * A section used to be five hand-synced edits in five files: an id in a tuple, a
 * field on a content type, a branch in the page's renderer, a branch in the
 * editor, and a line in the editor's table of contents. Nothing checked that the
 * five agreed, and adding one meant finding all of them.
 *
 * A module is those five things in one folder:
 *
 *   src/lib/sections/<type>/model.ts   the value, its blank, its normaliser
 *   src/lib/sections/<type>/view.tsx   what a visitor sees
 *   src/lib/sections/<type>/panel.tsx  the fields that edit it
 *
 * ── Why the three are wired up in three separate maps ─────────────────────
 *
 * `registry.ts` holds the models, `views.ts` the view components, `panels.ts`
 * the panels. One map holding all three would be tidier to read and wrong to
 * build: the public page imports the registry to normalise what it read, and a
 * registry that mentioned the panels would drag every admin panel — and with
 * them the whole admin UI, TipTap included — into the bundle a visitor
 * downloads.
 *
 * The split costs nothing in safety. All three maps are keyed by `SectionType`,
 * which is derived FROM the model registry, so a module with no view or no panel
 * does not compile. The compiler keeps the three in step, which is exactly what
 * nothing did before.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import type { ArticleSummary } from "@/lib/articles";
import type { DeckSummary } from "@/lib/decks";
import type { EventSummary } from "@/lib/events";
import type { FormSummary } from "@/lib/forms";
import type { SiteModule, SiteRef } from "@/lib/sites";
import type { Sport } from "@/lib/sports";
import type { Track } from "@/lib/tracks";

/**
 * Where a section may be placed.
 *
 * `home` is the body of a page. `chrome` is the header and footer — one of each
 * kind, always present, never reordered. They are the two page KINDS in
 * `ctr.pages` (0012), and a module says which of them it belongs on so the `+`
 * picker cannot offer a footer as a band halfway down a page.
 */
export const SURFACES = ["home", "chrome"] as const;
export type Surface = (typeof SURFACES)[number];

/**
 * Everything a section might need that is not its own stored value.
 *
 * Fetched ONCE by the route and handed down, which is the rule that makes the
 * admin's preview render the real page: a section that fetched for itself could
 * not be drawn from an unsaved draft, and could not be drawn in the browser at
 * all. Sections take content as props and never touch the database.
 *
 * Every field is here for at least one module, and a module that wants none of
 * them still takes the bundle — one shape for every view is worth more than a
 * per-section prop list nobody can check.
 */
export type SectionRecords = {
  /**
   * The site these sections belong to.
   *
   * Every link a section draws is under it — `/incrc/deck/<slug>`, not
   * `/deck/<slug>` — so a view that renders a card has to know which sport it
   * is on. It is also what tells a stored link apart from a stored address:
   * `slugFromDeckHref` only resolves a path under THIS site, so a card pointing
   * at another sport's deck stays a plain link instead of silently resolving to
   * a deck of ours with the same slug.
   */
  site: SiteRef;
  /** ctr.tracks. The venues cards and the calendar's rounds. */
  tracks: Track[];
  /** ctr.forms, this site's. The registration cards, and the CTA pickers. */
  forms: FormSummary[];
  /** ctr.decks, this site's published ones. The deck cards and the announcement. */
  decks: DeckSummary[];
  /** ctr.articles, this site's published ones. The announcement card. */
  articles: ArticleSummary[];
  /**
   * ctr.events, this site's published season, in its own order.
   *
   * The calendar band draws every one of them, which is why there is nothing
   * stored about WHICH — the same call `registrations` makes about forms. Empty
   * for a site with the `events` module switched off, which cannot have a
   * calendar band anyway.
   */
  events: EventSummary[];
  /** ctr.sports — the cards on the landing page, and the CTA band's links. */
  sports: Sport[];
  /**
   * The page's own identity, from its `meta` section.
   *
   * Read by the title, the search-engine markup and the structured data rather
   * than by any band — which is why what is left of it is three strings. The
   * introduction's follow button used to be here too, and 0019 moved it onto the
   * introduction: a section reading another section's value is a thing to have a
   * reason for, and "the band that draws it should own it" turned out to be the
   * better one.
   */
  meta: PageMeta;
};

/**
 * What every page knows about itself. Modelled in sections/meta/model.ts.
 *
 * Three fields left in 0019 — the follow chip's label, handle and address. They
 * were here because the handle "belongs to the page rather than to the band that
 * prints it", which reads well and put them on the one section that renders
 * nothing: editing them on a page with no introduction did nothing at all. They
 * are fields of the introduction now, where the chip is drawn.
 *
 * What is left is what every page genuinely has, whatever it is built from: a
 * name, a short name and a tagline, read by the title, the search-engine markup
 * and the structured data.
 */
export type PageMeta = {
  name: string;
  short: string;
  tagline: string;
};

/** What a view is handed. `T` is the module's own value type. */
export type SectionViewProps<T> = {
  value: T;
  records: SectionRecords;
  /**
   * The site header, supplied only to the first section of a page and only when
   * that section declares `carriesHeader`. Everything else ignores it.
   *
   * See `carriesHeader` below for why this is a prop rather than something the
   * route draws for itself.
   */
  header?: React.ReactNode;
};

/**
 * The editing state a panel may reach beyond its own value.
 *
 * Two entries, both for panels that are not purely a form over one JSON value:
 * the sports cards are database rows with a Save each, and the banners panel
 * drives which banner the preview holds on.
 */
export type PanelContext = {
  records: SectionRecords;
  /** The sports cards, which the `sportsSection` panel edits as rows. */
  sports: {
    items: Sport[];
    saved: Sport[];
    onItems: (next: Sport[]) => void;
    onSaved: (next: Sport[]) => void;
  };
  /** Holds the preview's carousel on one banner while it is open. */
  focusBanner: (index: number | undefined) => void;
};

export type SectionPanelProps<T> = {
  value: T;
  onChange: (next: T) => void;
  ctx: PanelContext;
};

/**
 * One kind of section: what it is called, where it may go, and how its stored
 * value is read.
 *
 * No components — see the note at the top of this file.
 */
export type SectionModule<T> = {
  /** The stored `page_sections.type`. Never changes once anything has saved it. */
  type: string;
  /** What the console calls it. */
  label: string;
  /** One line under the label, in the picker and over the fields. */
  hint: string;
  surface: readonly Surface[];
  /**
   * Site modules this section cannot work without.
   *
   * The calendar needs `events`, the deck cards need `decks`. A site with the
   * module switched off is not offered the section, and a section already placed
   * on such a site still renders — switching a module off hides its screens and
   * routes without deleting anything, and quietly dropping a band somebody wrote
   * would be a delete.
   */
  needs?: readonly SiteModule[];
  /** May one page carry more than one of these? */
  multiple: boolean;
  /**
   * Exactly one, always, and it cannot be added, removed or reordered.
   *
   * Two sections are like this and for two different reasons. `meta` is the
   * page's identity and renders nothing, so there is nothing to place. Every
   * chrome section is one of a fixed set — a page has one footer.
   */
  fixed?: boolean;
  /**
   * The `id` this section's view renders, without the `#`.
   *
   * The header's links are mostly bare anchors written for the home page, and
   * `sendAnchorsHome` needs to know which of them this page actually has. That
   * used to be a hand-kept `LOCAL_ANCHORS` set in the route, which is a list
   * that silently rots; here it is a property of the section, so a page's
   * anchors are whatever it is built from.
   */
  anchor?: string;
  /**
   * The header is laid over this section rather than drawn above it.
   *
   * True for the banners and nothing else. The route cannot decide this — it
   * would have to know which kind of section happens to be first — so the
   * section says so and the renderer passes the header down.
   */
  carriesHeader?: boolean;
  /**
   * Where the console's preview should scroll when this section is opened.
   *
   * Only the chrome sections set it, and they have to: the preview scrolls to
   * `[data-preview="<section id>"]`, and a chrome section has no element of its
   * own on the page — it is drawn inside the header or the footer, which belong
   * to every section at once. Without this, opening the footer's fields scrolls
   * a preview of the whole home page to the top and nothing appears to happen.
   *
   * A page band leaves it unset and is found by its id, which is the only way to
   * tell two bands of the same kind apart.
   */
  previewAt?: "head" | "foot";
  /**
   * Rows of another table belonging to this section, promoted out of `data`.
   *
   * `banners`, `posts` and `partners` are ordered lists of a handful of rows
   * each, and they are real tables so that media usage and link rewriting can
   * see inside them. `readPage` puts them back and `writePage` takes them out
   * again; this names which, and under which key of the section's own value.
   *
   * The test for whether something belongs here: it has no life away from the
   * section. A banner is a slide of one carousel. The calendar's rounds were
   * promoted too until 0018 showed they were the other thing — a weekend of
   * racing that people link to, print on a poster and write about — so they
   * became `ctr.events` and this section reads them as records instead.
   */
  promoted?: PromotedList;
  /** The value a newly added section starts with. */
  blank: () => T;
  /** Whatever came out of the jsonb column, made safe. Runs on read and on write. */
  normalise: (raw: unknown) => T;
};

/**
 * A promoted list: which table, and where it sits in the section's value.
 *
 * `key` is "" for the banners, whose whole value IS the list — that section
 * stores nothing else, so its `data` column is always `{}`.
 */
export type PromotedList = "banners" | "posts" | "partners";
