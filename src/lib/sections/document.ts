/**
 * A page, as an ordered list of section instances.
 *
 * This is what replaced `IncrcContent` and `LandingContent` — two hand-written
 * types, each with an 800-line normaliser, each describing one page that could
 * never be a second page. A page is now the same shape whatever site it belongs
 * to and whatever it is made of: rows in, rows out, each one normalised by its
 * own module.
 *
 * ── What "normalised" means here ──────────────────────────────────────────
 *
 * The same contract docs/defaults-sync.md records, moved down a level. It used
 * to be "a missing field falls back to the blank document"; it is now "a missing
 * field falls back to the module's `blank()`", and a section whose type this
 * build does not know is dropped rather than rendered. There is no whole-page
 * fallback any more because there is no whole-page shape to fall back to — a
 * page renders the sections it has, and a database that cannot be read renders
 * the error boundary, exactly as it did before.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { BLANK_META, type Meta } from "@/lib/sections/meta/model";
import { SECTION_MODULES, isSectionType, type SectionType } from "@/lib/sections/registry";
import type { PageMeta, Surface } from "@/lib/sections/types";
import type { PageKind } from "@/lib/sites";

/**
 * One section on one page.
 *
 * `id` is `page_sections.id` — a uuid, minted by the database for a section that
 * has been saved and by the browser for one that has just been added. It is the
 * identity a promoted list hangs off and the key the editor drags around, which
 * is the whole of what 0015 bought.
 *
 * `data` is the module's own value, already normalised. It is `unknown` here
 * because this type does not know which module it belongs to; every reader
 * narrows it through the module's own `normalise` or by knowing its type.
 */
export type Section = {
  id: string;
  type: SectionType;
  visible: boolean;
  data: unknown;
};

/** What comes out of the database before anything has been checked. */
export type StoredSection = {
  id: string;
  type: string;
  visible: boolean;
  data: unknown;
};

/**
 * Stored rows to a page.
 *
 * Order is the caller's — `readPage` sorts by `position`, and this preserves
 * whatever it was handed rather than sorting again, so a browser holding a
 * dragged-but-unsaved order gets that order back.
 *
 * A row whose type is unknown is dropped. That is the same rule the old
 * `sections()` normaliser applied to a retired section id, and it is what lets a
 * section be removed from the code without a migration.
 */
export function normaliseSections(rows: readonly StoredSection[]): Section[] {
  const sections: Section[] = [];

  for (const row of rows) {
    if (!isSectionType(row.type)) continue;

    sections.push({
      id: String(row.id),
      type: row.type,
      visible: row.visible !== false,
      data: SECTION_MODULES[row.type].normalise(row.data),
    });
  }

  return sections;
}

/** A newly added section: a fresh id and its module's blank value. */
export function blankSection(type: SectionType): Section {
  return {
    id: crypto.randomUUID(),
    type,
    visible: true,
    data: SECTION_MODULES[type].blank(),
  };
}

/**
 * Which sections may live on a page of this kind.
 *
 * Two vocabularies that are not the same list and happen to overlap in two
 * places: `PageKind` is what a ROW of ctr.pages is, `Surface` is where a SECTION
 * may be placed. A `custom` sub-page is a third kind of page and still a page
 * body, so it takes the same sections the home page does.
 *
 * One function rather than the `kind === "chrome" ? … : …` that was written out
 * in three places, because the day a fourth kind arrives is the day two of the
 * three get updated.
 */
export function surfaceOf(kind: PageKind): Surface {
  return kind === "chrome" ? "chrome" : "home";
}

/**
 * The fixed sections a surface must have, added to whatever is stored.
 *
 * `meta` on a page and the six chrome sections are not placed by anybody: they
 * exist because the page exists. A page saved before one of them was invented
 * simply has no row, and this puts a blank one in front of the editor rather
 * than leaving a gap the editor has to handle.
 *
 * Appended in registry order at the FRONT, so the console lists them above the
 * movable ones — which is where the old editors put their fixed tabs too.
 */
export function withFixed(sections: Section[], surface: Surface): Section[] {
  const present = new Set(sections.map((section) => section.type));

  const missing = (Object.keys(SECTION_MODULES) as SectionType[]).filter((type) => {
    const module = SECTION_MODULES[type];
    return module.fixed && module.surface.includes(surface) && !present.has(type);
  });

  return [...missing.map(blankSection), ...sections];
}

/** Only what belongs on this surface. */
export function onSurface(sections: readonly Section[], surface: Surface): Section[] {
  return sections.filter((section) => SECTION_MODULES[section.type].surface.includes(surface));
}

/**
 * The page's identity.
 *
 * Every page has one whether or not a row was ever saved, because everything
 * that reads it — the title, the markup, the follow button — needs six strings
 * rather than a maybe.
 */
export function metaOf(sections: readonly Section[]): PageMeta {
  const found = sections.find((section) => section.type === "meta");
  return found ? (found.data as Meta) : { ...BLANK_META };
}

/**
 * The in-page anchors this page actually has.
 *
 * A section that is switched off is left out of the render entirely, so its
 * anchor genuinely goes with it — which is why `visible` is checked here and not
 * only at render time. `sendAnchorsHome` sends everything else to the home page.
 */
export function anchorsOf(sections: readonly Section[]): string[] {
  return sections
    .filter((section) => section.visible)
    .map((section) => SECTION_MODULES[section.type].anchor)
    .filter((anchor): anchor is string => Boolean(anchor))
    .map((anchor) => `#${anchor}`);
}

/** What the picker has to exclude: the kinds already here. */
export function typesOf(sections: readonly Section[]): SectionType[] {
  return sections.map((section) => section.type);
}

/**
 * Whatever the console PUT, made into a page.
 *
 * The browser holds the whole page and sends it back whole, so this is the only
 * gate between an editor and the tables. Every value goes through its module's
 * normaliser, an unknown type is dropped, and an id that is not a uuid is
 * replaced rather than trusted — the write names ids explicitly, and a
 * malformed one would reach Postgres as a cast error instead of a bad request.
 */
export function sectionsFromInput(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return [];

  return normaliseSections(
    raw.filter(isRecord).map((entry) => ({
      id: isUuid(entry.id) ? (entry.id as string) : crypto.randomUUID(),
      type: typeof entry.type === "string" ? entry.type : "",
      visible: entry.visible !== false,
      data: entry.data,
    }))
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): boolean {
  return typeof value === "string" && UUID.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
