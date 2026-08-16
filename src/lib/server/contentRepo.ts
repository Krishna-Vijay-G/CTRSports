import "server-only";

import { cache } from "react";
import { assembleChrome, type Chrome } from "@/lib/chrome";
import {
  onSurface,
  sectionsFromInput,
  surfaceOf,
  withFixed,
  type Section,
} from "@/lib/sections/document";
import { readPage, writePage } from "@/lib/server/sectionsRepo";
import { getOrCreatePage, getSiteBySlug, type PageKind } from "@/lib/server/sitesRepo";
import { PAGE_KIND_LABELS, type Site } from "@/lib/sites";

/**
 * A page's sections, read and written by the site that owns it.
 *
 * Two functions where there were six. `getLandingContent`, `saveLandingContent`,
 * `getSportContent`, `saveSportContent`, `getIncrcContent` and
 * `saveIncrcContent` all did the same thing to different documents, and there
 * are no different documents any more — a page is an ordered list of section
 * instances whichever site it belongs to.
 *
 * Everything above this layer works in `Section[]`. Only `getChrome` returns
 * something else, because the header and the footer want six named things
 * rather than a list to search; see src/lib/chrome.ts.
 */

/**
 * What a page of each kind is called when one has to be created.
 *
 * Only ever used by the INSERT inside `getOrCreatePage`, which in practice never
 * runs — 0012 seeded every home page and 0017 every chrome page, and `createSite`
 * makes both. It matters for the same reason the create path exists at all: a
 * site made by a migration and a site made by the console must end up identical.
 */
function pageName(site: Site, kind: PageKind): string {
  return kind === "home" ? site.name : PAGE_KIND_LABELS[kind];
}

/**
 * Every section of one page, in order, normalised, with its fixed sections
 * filled in.
 *
 * `withFixed` is why the console never has to handle "this page has no identity
 * section yet": a page saved before `meta` existed simply has no row, and the
 * editor is handed a blank one to write into. Saving then creates it.
 *
 * `cache()` for the same reason every other read has it: a route asks once in
 * `generateMetadata` and again in the component, and that should be one round
 * trip. Nothing wider than a request — an edit is visible immediately.
 */
export const getPage = cache(async (siteId: string, kind: PageKind, name: string) => {
  const page = await getOrCreatePage(siteId, kind, name);
  return withFixed(await readPage(page.id), surfaceOf(kind));
});

/** The same, from a site rather than an id — which is what every caller has. */
export function readSitePage(site: Site, kind: PageKind): Promise<Section[]> {
  return getPage(site.id, kind, pageName(site, kind));
}

/** One sport's home page, by slug. Throws for a slug that names no site. */
export const getSitePage = cache(async (slug: string): Promise<Section[]> => {
  const site = await getSiteBySlug(slug);
  if (!site) throw new Error(`No site with the address "${slug}".`);
  return readSitePage(site, "home");
});

/**
 * Replaces a page wholesale.
 *
 * There is no per-section endpoint on purpose: the console holds the whole page
 * — including the order and which sections are on it — and saves it in one go,
 * so a partial write has no way to leave a section placed with nothing in it.
 *
 * Returns what was actually stored, normalised, which is what the editor takes
 * back so the form shows the clamped values rather than what was typed.
 */
export async function savePage(site: Site, kind: PageKind, input: unknown): Promise<Section[]> {
  const page = await getOrCreatePage(site.id, kind, pageName(site, kind));
  const surface = surfaceOf(kind);

  /*
   * A page may only carry sections that belong on it.
   *
   * `sectionsFromInput` already drops a type this build has never heard of, but
   * it has no opinion about WHERE a known one may sit — and the page kind is a
   * query parameter, so a request could otherwise put a footer halfway down a
   * page body or an about band inside the header. Neither would render (both
   * readers filter by surface) and both would sit in the table as a row nothing
   * could ever reach to delete.
   */
  const sections = onSurface(sectionsFromInput(input), surface);

  await writePage(page.id, sections);
  return withFixed(sections, surface);
}

/* ─────────────────────────────── The chrome ─────────────────────────────── */

/**
 * The header and footer a site draws, on every one of its pages.
 *
 * The SITE's own since 0017. Until then there was one chrome for the whole
 * deployment — the root's, sitting on the root's home page beside its bands —
 * because there was one site. A sport now has its own brand, its own navigation
 * and its own footer, and 0017 seeded each sport's with a copy of the root's so
 * that nothing changed on the day it moved.
 *
 * `onSurface` rather than a list of the six: a section knows which surface it
 * belongs on, so nothing here has to keep one. It is belt and braces after
 * `savePage`, which already refuses to write a page band onto a chrome page —
 * but a filter on read is what makes a row that got there some other way
 * harmless rather than a rendering bug.
 *
 * Not `cache()`d, unlike everything around it, and deliberately: `cache` keys on
 * the IDENTITY of its arguments, and this one takes an object. The read it does
 * is `getPage`, which is cached on three strings, so a page that asks for its
 * chrome twice still makes one round trip — the memo would only save an
 * `assembleChrome`, and only when the caller happened to pass the same object.
 */
export async function getChrome(site: Site): Promise<Chrome> {
  const sections = await readSitePage(site, "chrome");
  return assembleChrome(onSurface(sections, "chrome"));
}
