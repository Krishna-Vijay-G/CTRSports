import { getSql } from "@/lib/db";
import { normaliseLandingContent } from "@/lib/normaliseContent";
import { DEFAULT_LANDING_CONTENT, type LandingContent } from "@/data/landingContent";

/** The only key so far; other pages would add their own. */
export const LANDING_KEY = "landing";

/**
 * The landing page's copy, as stored. Falls back to the defaults when there is
 * no row yet, and normalises whatever is there, so a fresh database and a
 * half-written document both render a complete page.
 *
 * A database that is down is the caller's problem to catch — the page treats it
 * the same way it treats missing posts.
 */
export async function getLandingContent(): Promise<LandingContent> {
  const sql = getSql();
  const rows = (await sql`
    SELECT content FROM site_content WHERE key = ${LANDING_KEY}
  `) as { content: unknown }[];

  return normaliseLandingContent(rows[0]?.content);
}

/** Same as above but never throws — for the public page, which must always render. */
export async function getLandingContentSafe(): Promise<LandingContent> {
  try {
    return await getLandingContent();
  } catch (error) {
    console.error("[content] could not load landing content", error);
    return DEFAULT_LANDING_CONTENT;
  }
}

/** Stores the document already normalised, so a bad write cannot land. */
export async function saveLandingContent(content: LandingContent): Promise<LandingContent> {
  const sql = getSql();
  const normalised = normaliseLandingContent(content);

  await sql`
    INSERT INTO site_content (key, content, updated_at)
    VALUES (${LANDING_KEY}, ${JSON.stringify(normalised)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
      SET content    = EXCLUDED.content,
          updated_at = now()
  `;

  return normalised;
}
