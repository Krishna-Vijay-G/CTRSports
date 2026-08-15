import "server-only";

import { cache } from "react";
import { readPage, writePage } from "@/lib/server/sectionsRepo";
import { normaliseIncrcContent, type IncrcContent } from "@/lib/incrcContent";
import { normaliseLandingContent, type LandingContent } from "@/lib/landingContent";

/** One key per page. A new page adds a key here and a trio of functions below. */
export const LANDING_KEY = "landing";
export const INCRC_KEY = "incrc";

/**
 * The landing page's copy and photography, as stored. Falls back to the
 * defaults when there is no row yet, and normalises whatever is there, so a
 * fresh database and a half-written document both render a complete page.
 *
 * A database that is down is the caller's problem to catch.
 */
export const getLandingContent = cache(async (): Promise<LandingContent> => {
  return normaliseLandingContent(await read(LANDING_KEY));
});

/** Stores the document already normalised, so a bad write cannot land. */
export async function saveLandingContent(input: unknown): Promise<LandingContent> {
  return write(LANDING_KEY, normaliseLandingContent(input));
}

/* ────────────────────────────── /incrc ────────────────────────────── */
/* The same three functions against a different key. Deliberately spelled out
   rather than made generic over the normaliser: two pages is not enough
   repetition to be worth a layer of indirection, and each one is four lines. */

export const getIncrcContent = cache(async (): Promise<IncrcContent> => {
  return normaliseIncrcContent(await read(INCRC_KEY));
});

export async function saveIncrcContent(input: unknown): Promise<IncrcContent> {
  return write(INCRC_KEY, normaliseIncrcContent(input));
}

/* ────────────────────────────── The rows ────────────────────────────── */
/*
 * There is no `content` table any more. A page is a row per section in
 * `page_sections`, plus four promoted tables — see sectionsRepo, which is where
 * the taking-apart and putting-back-together lives.
 *
 * These two stay because the six functions above are a contract: everything
 * that edits a page calls them, and none of it knows or needs to know that the
 * document stopped being one column.
 *
 * The reads are wrapped in React `cache()`. Every page here is read twice per
 * request — once by `generateMetadata` and once by the component — and that was
 * two identical round trips on every page load. `cache()` dedupes within a
 * single request and nothing wider, so an edit is still visible immediately.
 */

async function read(key: string): Promise<unknown> {
  return readPage(key);
}

async function write<T>(key: string, normalised: T): Promise<T> {
  await writePage(key, normalised);
  return normalised;
}
