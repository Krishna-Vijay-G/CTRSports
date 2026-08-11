import "server-only";

import { getSql } from "@/lib/server/db";
import {
  DEFAULT_LANDING_CONTENT,
  normaliseLandingContent,
  type LandingContent,
} from "@/lib/landingContent";

/** The only key so far; another page would add its own. */
export const LANDING_KEY = "landing";

/**
 * The landing page's copy and photography, as stored. Falls back to the
 * defaults when there is no row yet, and normalises whatever is there, so a
 * fresh database and a half-written document both render a complete page.
 *
 * A database that is down is the caller's problem to catch.
 */
export async function getLandingContent(): Promise<LandingContent> {
  const sql = getSql();
  const rows = (await sql`
    SELECT content FROM ctr_content WHERE key = ${LANDING_KEY}
  `) as { content: unknown }[];

  return normaliseLandingContent(rows[0]?.content);
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
  const sql = getSql();
  const normalised = normaliseLandingContent(input);

  await sql`
    INSERT INTO ctr_content (key, content, updated_at)
    VALUES (${LANDING_KEY}, ${JSON.stringify(normalised)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
      SET content    = EXCLUDED.content,
          updated_at = now()
  `;

  return normalised;
}
