import "server-only";

import { getSql } from "@/lib/server/db";
import { SECTION_MODULES, isSectionType } from "@/lib/sections/registry";
import { normaliseSections, type Section, type StoredSection } from "@/lib/sections/document";

/**
 * A page, taken apart into rows and put back together.
 *
 * The two pages used to be one JSONB document each: seventeen nested sections in
 * a single column, re-parsed on every read and rewritten whole every time
 * somebody changed one word. 0006 turned each top-level key into a row and
 * promoted the four lists that are really tables. 0015 took the last step — a
 * section is an instance with an id of its own, so a page may carry two of a
 * kind or none, and the promoted rows hang off the section rather than the page.
 *
 * ── What replaced "a section id is the document's own top-level key" ──────
 *
 * That rule ran this file from 0006 until 0015, in capitals, and it was right
 * for a fixed document. What replaced it is narrower and does the same job:
 *
 *   A SECTION'S `data` IS WHATEVER ITS MODULE'S `normalise` CAN READ.
 *
 * Nothing between this file and the module knows the shape. The three promoted
 * lists are put back under the key the module names — `banners.items`,
 * `posts.items`, `intro.partners` — and that mapping is the one thing this file
 * has to know about any particular section, which is why `promoted` is declared
 * on the module rather than matched on shape here.
 *
 * There were four until 0018. `calendar.rounds` left because a round of the
 * season stopped being a list inside a band and became `ctr.events`, a row with
 * an address of its own — which is what a promoted list is NOT for: the three
 * that are left have no life away from the section they belong to.
 *
 * ── Why the assembly is SQL and not TypeScript ────────────────────────────
 *
 * One round trip instead of five, which keeps a page read exactly as cheap as it
 * was when the document was one row.
 */

/** Where a promoted list is put back, by the module that declares it. */
const PROMOTED_KEY = {
  banners: "items",
  posts: "items",
  partners: "partners",
} as const;

type Row = {
  id: string;
  type: string;
  visible: boolean;
  position: number;
  data: unknown;
};

/**
 * Every section of a page, in order, with its promoted rows folded back in.
 *
 * Returns the raw stored shape. `normalisePage` below is what turns it into
 * something a renderer may trust; they are separate because the write path
 * needs the raw rows too.
 */
export async function readSections(pageId: string): Promise<StoredSection[]> {
  const sql = getSql();

  const rows = (await sql`
    SELECT ps.id, ps.type, ps.visible, ps."position",
           CASE ps.type
             WHEN 'banners' THEN ps.data || jsonb_build_object('items', (
               SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'id', banner_id, 'template', template, 'image', image, 'fit', fit,
                 'focus', focus, 'overlay', overlay, 'title', title, 'subtitle', subtitle,
                 'ctaLabel', cta_label, 'ctaHref', cta_href) ORDER BY "position"), '[]'::jsonb)
                 FROM ctr.banners WHERE section_id = ps.id))

             WHEN 'posts' THEN ps.data || jsonb_build_object('items', (
               SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'id', post_id, 'image', image, 'category', category, 'date', date,
                 'title', title, 'excerpt', excerpt, 'href', href) ORDER BY "position"), '[]'::jsonb)
                 FROM ctr.posts WHERE section_id = ps.id))

             WHEN 'intro' THEN ps.data || jsonb_build_object('partners', (
               SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'name', name, 'logo', logo, 'href', href) ORDER BY "position"), '[]'::jsonb)
                 FROM ctr.partners WHERE section_id = ps.id))

             ELSE ps.data
           END AS data
      FROM ctr.page_sections ps
     WHERE ps.page_id = ${pageId}
     ORDER BY ps."position"
  `) as Row[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    visible: row.visible,
    data: row.data,
  }));
}

/** The same read, made safe: unknown types dropped, every value normalised. */
export async function readPage(pageId: string): Promise<Section[]> {
  return normaliseSections(await readSections(pageId));
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];

/** The section's own data, minus whatever was promoted out of it. */
function dataOf(section: Section): unknown {
  const module = SECTION_MODULES[section.type];
  const value = section.data;

  if (!module.promoted) return value ?? {};
  if (!value || typeof value !== "object") return {};

  // `socials` is a bare array and has no promoted list, so this only ever runs
  // on an object.
  const stripped = { ...(value as Record<string, unknown>) };
  delete stripped[PROMOTED_KEY[module.promoted]];
  return stripped;
}

/** The rows promoted out of a section, in the order they are stored. */
function promotedOf(section: Section): Record<string, unknown>[] {
  const module = SECTION_MODULES[section.type];
  if (!module.promoted) return [];

  const value = section.data as Record<string, unknown> | null;
  return list(value?.[PROMOTED_KEY[module.promoted]]);
}

/**
 * Writes a page back, one row per section.
 *
 * The whole thing goes in one transaction: a half-written page is a page with
 * one section from before the save and the rest from after it, which would be
 * indistinguishable from an editing mistake.
 *
 * `updated_at` moves only on the sections whose data actually changed, which is
 * the point of storing them apart — saving one word touches one row, and the
 * console can honestly say when each section was last edited.
 *
 * ── The section ids come from the browser ─────────────────────────────────
 *
 * A section added in the console is given a uuid there and arrives here with it,
 * so the INSERT can name it and the promoted rows can point at it in the same
 * transaction. That is safe because the id identifies nothing outside this page:
 * an id that collides with a section of another page is rejected by the primary
 * key, and one that collides with a section of THIS page is the same section
 * being written twice, which the list cannot contain.
 *
 * The four promoted lists are replaced wholesale rather than reconciled. They
 * are ordered lists of a handful of rows, their identity IS their position, and
 * a diff would buy nothing but a way to be subtly wrong about it.
 */
export async function writePage(pageId: string, sections: readonly Section[]): Promise<void> {
  const sql = getSql();

  const kept = sections.filter((section) => isSectionType(section.type));
  const ids = kept.map((section) => section.id);

  const statements = [
    /*
     * Removed sections go FIRST, so a page that dropped one and added another
     * cannot momentarily hold both. The promoted rows go with them by cascade,
     * which is the whole reason 0015 re-keyed those tables.
     */
    sql`
      DELETE FROM ctr.page_sections
       WHERE page_id = ${pageId} AND NOT (id = ANY(${ids}::uuid[]))
    `,

    ...kept.map(
      (section, index) => sql`
        INSERT INTO ctr.page_sections (id, page_id, type, "position", visible, data, updated_at)
        VALUES (${section.id}, ${pageId}, ${section.type}, ${index + 1}, ${section.visible},
                ${JSON.stringify(dataOf(section))}::jsonb, now())
        ON CONFLICT (id) DO UPDATE
          SET "position" = EXCLUDED."position",
              visible    = EXCLUDED.visible,
              data       = EXCLUDED.data,
              -- Only when something actually changed. A save that touched one
              -- section must not restamp the other fourteen.
              updated_at = CASE
                WHEN page_sections.data IS DISTINCT FROM EXCLUDED.data
                  OR page_sections.visible IS DISTINCT FROM EXCLUDED.visible
                  OR page_sections."position" IS DISTINCT FROM EXCLUDED."position"
                THEN now() ELSE page_sections.updated_at END
      `
    ),
  ];

  for (const section of kept) {
    const module = SECTION_MODULES[section.type];
    if (!module.promoted) continue;

    const rows = promotedOf(section);
    const id = section.id;

    if (module.promoted === "banners") {
      statements.push(sql`DELETE FROM ctr.banners WHERE section_id = ${id}`);
      statements.push(
        ...rows.map(
          (banner, index) => sql`
            INSERT INTO ctr.banners (section_id, banner_id, "position", template, image, fit,
                                     focus, overlay, title, subtitle, cta_label, cta_href)
            VALUES (${id}, ${text(banner.id) || `banner-${index + 1}`}, ${index + 1},
                    ${text(banner.template) || "spotlight"}, ${text(banner.image)},
                    ${text(banner.fit) || "fill"}, ${text(banner.focus) || "center"},
                    ${text(banner.overlay) || "normal"}, ${text(banner.title)},
                    ${text(banner.subtitle)}, ${text(banner.ctaLabel)}, ${text(banner.ctaHref)})
          `
        )
      );
    }

    if (module.promoted === "posts") {
      statements.push(sql`DELETE FROM ctr.posts WHERE section_id = ${id}`);
      statements.push(
        ...rows.map(
          (post, index) => sql`
            INSERT INTO ctr.posts (section_id, post_id, "position", image, category, date,
                                   title, excerpt, href)
            VALUES (${id}, ${text(post.id) || `post-${index + 1}`}, ${index + 1},
                    ${text(post.image)}, ${text(post.category)}, ${text(post.date)},
                    ${text(post.title)}, ${text(post.excerpt)}, ${text(post.href)})
          `
        )
      );
    }

    if (module.promoted === "partners") {
      statements.push(sql`DELETE FROM ctr.partners WHERE section_id = ${id}`);
      statements.push(
        ...rows.map(
          (partner, index) => sql`
            INSERT INTO ctr.partners (section_id, "position", name, logo, href)
            VALUES (${id}, ${index + 1}, ${text(partner.name)}, ${text(partner.logo)},
                    ${text(partner.href)})
          `
        )
      );
    }

  }

  await sql.transaction(statements);
}
