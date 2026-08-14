import "server-only";

import { getSql } from "@/lib/server/db";
import {
  DEFAULT_INCRC_CONTENT,
  normaliseIncrcContent,
  type IncrcContent,
} from "@/lib/incrcContent";
import {
  DEFAULT_LANDING_CONTENT,
  normaliseLandingContent,
  type LandingContent,
} from "@/lib/landingContent";

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
export async function getLandingContent(): Promise<LandingContent> {
  return normaliseLandingContent(await read(LANDING_KEY));
}

/**
 * Same, but never throws — for the public page, which must always render.
 * An unreachable database falls back to the defaults rather than a blank page.
 */
export async function getLandingContentSafe(): Promise<LandingContent> {
  try {
    return await getLandingContent();
  } catch (error) {
    console.error("[content] could not load landing content", error);
    return DEFAULT_LANDING_CONTENT;
  }
}

/** Stores the document already normalised, so a bad write cannot land. */
export async function saveLandingContent(input: unknown): Promise<LandingContent> {
  return write(LANDING_KEY, normaliseLandingContent(input));
}

/* ────────────────────────────── /incrc ────────────────────────────── */
/* The same three functions against a different key. Deliberately spelled out
   rather than made generic over the normaliser: two pages is not enough
   repetition to be worth a layer of indirection, and each one is four lines. */

export async function getIncrcContent(): Promise<IncrcContent> {
  return normaliseIncrcContent(await read(INCRC_KEY));
}

export async function getIncrcContentSafe(): Promise<IncrcContent> {
  try {
    return await getIncrcContent();
  } catch (error) {
    console.error("[content] could not load INCRC content", error);
    return DEFAULT_INCRC_CONTENT;
  }
}

export async function saveIncrcContent(input: unknown): Promise<IncrcContent> {
  return write(INCRC_KEY, normaliseIncrcContent(input));
}

/* ─────────────────────────────── The row ─────────────────────────────── */

async function read(key: string): Promise<unknown> {
  const sql = getSql();
  const rows = (await sql`SELECT content FROM content WHERE key = ${key}`) as {
    content: unknown;
  }[];

  return rows[0]?.content;
}

async function write<T>(key: string, normalised: T): Promise<T> {
  const sql = getSql();

  await sql`
    INSERT INTO content (key, content, updated_at)
    VALUES (${key}, ${JSON.stringify(normalised)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
      SET content    = EXCLUDED.content,
          updated_at = now()
  `;

  return normalised;
}
