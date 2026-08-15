import "server-only";

import { getSql } from "@/lib/server/db";

/**
 * A page document, taken apart into rows and put back together.
 *
 * The two pages used to be one JSONB document each: seventeen nested sections in
 * a single column, re-parsed on every read and rewritten whole every time
 * somebody changed one word. Migration 0006 turned each top-level key into a row
 * and promoted the four lists that are really tables. This is the pair of
 * functions that hides that from everything above it — `contentRepo` still
 * hands out and takes back the same document it always did.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 *
 *   A SECTION ID IS THE DOCUMENT'S OWN TOP-LEVEL KEY.
 *
 * So assembly is `document[section_id] = data`, with no alias table between the
 * two names and nothing to get wrong. Promoted back into place afterwards:
 * `banners`, `calendar.rounds`, `posts.items` and `intro.partners` — and
 * nothing else. Every other list in the document (`rows.items`, `stats.items`,
 * `vision.items`, `marquee.items`, `family.links`, `partnership.shots`,
 * `decks.items`, `about.photos`) stays inside its section's blob, which is why
 * the keys below are named one at a time rather than matched on shape.
 *
 * ── Why the assembly is SQL and not TypeScript ────────────────────────────
 *
 * One round trip instead of five, which keeps a page read exactly as cheap as
 * it was when the document was one row — and this exact query was checked
 * against production data before the columns were dropped: both documents came
 * back byte-identical, compared with jsonb equality rather than by eye.
 *
 * ── The defaults contract ─────────────────────────────────────────────────
 *
 * A section with no row is simply an absent key, and `normalise*Content` fills
 * an absent key from `DEFAULT_*_CONTENT` field by field — which is the contract
 * docs/defaults-sync.md records. Storing sections separately makes that finer
 * grained rather than weaker: a missing FIELD fell back before, and a missing
 * SECTION falls back now too.
 */

/** INCRC carries a running order in the document; the landing page's is in the renderer. */
const RUNNING_ORDER: Record<string, boolean> = { incrc: true };

/**
 * The landing page's section order.
 *
 * Nothing renders from it — that page's order is fixed in
 * `src/app/(site)/page.tsx` — so this is what the admin rail sorts by, and what
 * keeps `position` meaning the same thing on both pages.
 */
const LANDING_ORDER = [
  "brand",
  "nav",
  "splash",
  "about",
  "sportsSection",
  "ctaBand",
  "contact",
  "socials",
  "footer",
];

/** Promoted out of their sections, and put back by `readPage`. */
const PROMOTED = ["banners", "sections"] as const;

export async function readPage(key: string): Promise<unknown> {
  const sql = getSql();

  const rows = (await sql`
    WITH base AS (
      SELECT jsonb_object_agg(section_id, data) AS doc
        FROM ctr.page_sections WHERE page_key = ${key}
    ), with_banners AS (
      SELECT base.doc || jsonb_build_object('banners', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', banner_id, 'template', template, 'image', image, 'fit', fit,
          'focus', focus, 'overlay', overlay, 'title', title, 'subtitle', subtitle,
          'ctaLabel', cta_label, 'ctaHref', cta_href) ORDER BY position), '[]'::jsonb)
          FROM ctr.banners WHERE page_key = ${key})) AS doc
        FROM base
    ), with_rounds AS (
      SELECT CASE WHEN doc ? 'calendar' THEN jsonb_set(doc, '{calendar,rounds}', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'round', round,
          'start', coalesce(to_char(date_from, 'YYYY-MM-DD'), ''),
          'end', coalesce(to_char(date_to, 'YYYY-MM-DD'), ''),
          'dates', dates, 'trackId', coalesce(track_id::text, ''),
          'venue', venue, 'city', city, 'status', status) ORDER BY position), '[]'::jsonb)
          FROM ctr.calendar_rounds WHERE page_key = ${key})) ELSE doc END AS doc
        FROM with_banners
    ), with_posts AS (
      SELECT CASE WHEN doc ? 'posts' THEN jsonb_set(doc, '{posts,items}', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', post_id, 'image', image, 'category', category, 'date', date,
          'title', title, 'excerpt', excerpt, 'href', href) ORDER BY position), '[]'::jsonb)
          FROM ctr.posts WHERE page_key = ${key})) ELSE doc END AS doc
        FROM with_rounds
    ), with_partners AS (
      SELECT CASE WHEN doc ? 'intro' THEN jsonb_set(doc, '{intro,partners}', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'name', name, 'logo', logo, 'href', href) ORDER BY position), '[]'::jsonb)
          FROM ctr.partners WHERE page_key = ${key})) ELSE doc END AS doc
        FROM with_posts
    )
    SELECT CASE WHEN ${Boolean(RUNNING_ORDER[key])}
                THEN doc || jsonb_build_object('sections', coalesce((
                  SELECT jsonb_agg(jsonb_build_object('id', section_id, 'visible', visible)
                           ORDER BY position)
                    FROM ctr.page_sections
                   WHERE page_key = ${key} AND position IS NOT NULL), '[]'::jsonb))
                ELSE doc END AS document
      FROM with_partners
  `) as { document: unknown }[];

  // No rows at all is a page nobody has saved yet, and an absent document is
  // what makes the whole of DEFAULT_*_CONTENT render.
  return rows[0]?.document ?? undefined;
}

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const list = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];

/** "" and anything unparseable become NULL: a round with no date has no countdown. */
const date = (value: unknown): string | null =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

/**
 * Writes the document back, one row per section.
 *
 * The whole thing goes in one transaction: a half-written page is a page with
 * one section from before the save and the rest from after it, which would be
 * indistinguishable from an editing mistake.
 *
 * `updated_at` moves only on the sections whose data actually changed, which is
 * the point of storing them apart — saving one word touches one row, and the
 * console can honestly say when each section was last edited.
 *
 * The four promoted lists are replaced wholesale rather than reconciled. They
 * are ordered lists of a handful of rows, their identity IS their position, and
 * a diff would buy nothing but a way to be subtly wrong about it.
 */
export async function writePage(key: string, document: unknown): Promise<void> {
  const sql = getSql();
  const doc = (document ?? {}) as Row;

  const running = list(doc.sections);
  const sections = Object.keys(doc).filter(
    (id) => !(PROMOTED as readonly string[]).includes(id)
  );

  const positionOf = (id: string): number | null => {
    if (RUNNING_ORDER[key]) {
      const at = running.findIndex((entry) => text(entry.id) === id);
      return at < 0 ? null : at + 1;
    }
    const at = LANDING_ORDER.indexOf(id);
    return at < 0 ? null : at + 1;
  };

  const visibleOf = (id: string): boolean => {
    const entry = running.find((item) => text(item.id) === id);
    return entry ? entry.visible !== false : true;
  };

  /** The section's data, minus whatever was promoted out of it. */
  const dataOf = (id: string): unknown => {
    const value = doc[id];
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;

    const stripped = { ...(value as Row) };
    if (id === "calendar") delete stripped.rounds;
    if (id === "posts") delete stripped.items;
    if (id === "intro") delete stripped.partners;
    return stripped;
  };

  const banners = list(doc.banners);
  const rounds = list((doc.calendar as Row | undefined)?.rounds);
  const posts = list((doc.posts as Row | undefined)?.items);
  const partners = list((doc.intro as Row | undefined)?.partners);

  await sql.transaction([
    ...sections.map(
      (id) => sql`
        INSERT INTO ctr.page_sections (page_key, section_id, position, visible, data, updated_at)
        VALUES (${key}, ${id}, ${positionOf(id)}, ${visibleOf(id)},
                ${JSON.stringify(dataOf(id) ?? {})}::jsonb, now())
        ON CONFLICT (page_key, section_id) DO UPDATE
          SET position   = EXCLUDED.position,
              visible    = EXCLUDED.visible,
              data       = EXCLUDED.data,
              -- Only when something actually changed. A save that touched one
              -- section must not restamp the other fourteen.
              updated_at = CASE
                WHEN page_sections.data IS DISTINCT FROM EXCLUDED.data
                  OR page_sections.visible IS DISTINCT FROM EXCLUDED.visible
                  OR page_sections.position IS DISTINCT FROM EXCLUDED.position
                THEN now() ELSE page_sections.updated_at END
      `
    ),
    // A section removed from the document — a retired one, or a page saved by
    // an older build. Its row goes, and the default renders in its place.
    sql`
      DELETE FROM ctr.page_sections
       WHERE page_key = ${key} AND NOT (section_id = ANY(${sections}::text[]))
    `,

    sql`DELETE FROM ctr.banners WHERE page_key = ${key}`,
    ...banners.map(
      (banner, index) => sql`
        INSERT INTO ctr.banners (page_key, banner_id, position, template, image, fit, focus,
                             overlay, title, subtitle, cta_label, cta_href)
        VALUES (${key}, ${text(banner.id) || `${key}-banner-${index + 1}`}, ${index + 1},
                ${text(banner.template) || "spotlight"}, ${text(banner.image)},
                ${text(banner.fit) || "fill"}, ${text(banner.focus) || "center"},
                ${text(banner.overlay) || "normal"}, ${text(banner.title)},
                ${text(banner.subtitle)}, ${text(banner.ctaLabel)}, ${text(banner.ctaHref)})
      `
    ),

    sql`DELETE FROM ctr.calendar_rounds WHERE page_key = ${key}`,
    ...rounds.map(
      (round, index) => sql`
        INSERT INTO ctr.calendar_rounds (page_key, position, round, venue, city,
                                     date_from, date_to, dates, status, track_id)
        VALUES (${key}, ${index + 1}, ${text(round.round)}, ${text(round.venue)},
                ${text(round.city)}, ${date(round.start)}, ${date(round.end)},
                ${text(round.dates)}, ${text(round.status)},
                -- A circuit that has since been deleted resolves to NULL rather
                -- than failing the foreign key. The card falls back to the venue
                -- and city beside it, which is what the renderer already does.
                (SELECT id FROM ctr.tracks WHERE id::text = ${text(round.trackId)}))
      `
    ),

    sql`DELETE FROM ctr.posts WHERE page_key = ${key}`,
    ...posts.map(
      (post, index) => sql`
        INSERT INTO ctr.posts (page_key, post_id, position, image, category, date,
                           title, excerpt, href)
        VALUES (${key}, ${text(post.id) || `${key}-post-${index + 1}`}, ${index + 1},
                ${text(post.image)}, ${text(post.category)}, ${text(post.date)},
                ${text(post.title)}, ${text(post.excerpt)}, ${text(post.href)})
      `
    ),

    sql`DELETE FROM ctr.partners WHERE page_key = ${key}`,
    ...partners.map(
      (partner, index) => sql`
        INSERT INTO ctr.partners (page_key, position, name, logo, href)
        VALUES (${key}, ${index + 1}, ${text(partner.name)}, ${text(partner.logo)},
                ${text(partner.href)})
      `
    ),
  ]);
}
