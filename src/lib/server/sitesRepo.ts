import "server-only";

import { cache } from "react";
import { getSql } from "@/lib/server/db";
import {
  normaliseModules,
  normaliseSiteKind,
  normaliseSiteStatus,
  siteSlugProblem,
  type PageKind,
  type Site,
  type SiteModule,
} from "@/lib/sites";

/**
 * Every read and write of ctr.sites, ctr.site_modules and ctr.pages.
 *
 * The three belong in one repo because they are never useful apart: a site
 * without its modules cannot answer "does this sport have circuits?", and a
 * site without its pages has nowhere to put a section. One query assembles all
 * three, and `listSites` is the only read anything else needs — a request that
 * touches sites usually touches every one of them (the switcher, the nav, the
 * route's `generateStaticParams`), and there are two of them.
 */

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  accent: string;
  sort_order: number;
  modules: unknown;
};

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: normaliseSiteKind(row.kind),
    status: normaliseSiteStatus(row.status),
    accent: row.accent,
    sortOrder: row.sort_order,
    modules: normaliseModules(row.modules),
  };
}

const SELECT = `
  SELECT s.id, s.slug, s.name, s.kind, s.status, s.accent, s.sort_order,
         coalesce((SELECT jsonb_agg(m.module ORDER BY m.module)
                     FROM ctr.site_modules m WHERE m.site_id = s.id), '[]'::jsonb) AS modules
    FROM ctr.sites s`;

/**
 * Every site, drafts included. The admin's list, and the resolver for `/[sport]`.
 *
 * `cache()` for the same reason every other read has it: a sport page asks once
 * in `generateMetadata` and again in the component, and that should be one
 * round trip. Nothing wider than a request — an edit is visible immediately.
 */
export const listSites = cache(async (): Promise<Site[]> => {
  const rows = (await getSql().query(
    `${SELECT} ORDER BY s.kind = 'root' DESC, s.sort_order ASC, s.name ASC`
  )) as SiteRow[];

  return rows.map(toSite);
});

/** One site by its slug, or null. What every public `/[sport]` route resolves through. */
export const getSiteBySlug = cache(async (slug: string): Promise<Site | null> => {
  const sites = await listSites();
  return sites.find((site) => site.slug === slug) ?? null;
});

export const getSiteById = cache(async (id: string): Promise<Site | null> => {
  const sites = await listSites();
  return sites.find((site) => site.id === id) ?? null;
});

/**
 * The root site.
 *
 * Throws rather than returning null: the landing page cannot render without it,
 * and there is a unique index in migration 0012 guaranteeing exactly one. A
 * missing root is a broken database, not a case to branch on.
 */
export const getRootSite = cache(async (): Promise<Site> => {
  const sites = await listSites();
  const root = sites.find((site) => site.kind === "root");
  if (!root) throw new Error("No root site. Run npm run db:migrate.");
  return root;
});

/* ─────────────────────────────── Pages ──────────────────────────────────── */

/** Re-exported so a repo caller has one import for "sites and their pages". */
export type { PageKind };

export type PageRef = {
  id: string;
  siteId: string;
  kind: PageKind;
  slug: string;
  name: string;
};

/**
 * A site's page of one kind, creating it if it is not there yet.
 *
 * `home` is seeded by migration 0012 and `chrome` by 0017, so in practice this
 * finds one. It creates rather than failing because a site made through the
 * console and a site made by a migration must end up identical, and the
 * alternative is every caller handling "this site has no chrome yet".
 */
export const getOrCreatePage = cache(
  async (siteId: string, kind: PageKind, name: string): Promise<PageRef> => {
    const sql = getSql();

    type Row = { id: string; site_id: string; kind: string; slug: string; name: string };

    /*
     * Read first, and only insert when there is nothing there.
     *
     * The obvious shape is one `INSERT … ON CONFLICT DO UPDATE … RETURNING`,
     * which is shorter and was wrong: this is called by every page read — the
     * landing page, every sport page, both admin editors — so an upsert would
     * mean an INSERT and a row lock on every request to a page that has existed
     * since migration 0012. A page is created once in the life of a site and
     * read on every hit, so the read is the path worth being cheap.
     *
     * The insert still carries `ON CONFLICT DO NOTHING` and re-selects after,
     * because two requests can arrive together for a site whose page really is
     * missing — the second one loses the race and must find the first one's row
     * rather than fail.
     */
    const found = (await sql`
      SELECT id, site_id, kind, slug, name FROM ctr.pages
       WHERE site_id = ${siteId} AND kind = ${kind}
    `) as Row[];

    const row =
      found[0] ??
      (
        (await sql`
          WITH made AS (
            INSERT INTO ctr.pages (site_id, kind, name, sort_order)
            VALUES (${siteId}, ${kind}, ${name}, ${kind === "home" ? 10 : 20})
            ON CONFLICT DO NOTHING
            RETURNING id, site_id, kind, slug, name
          )
          SELECT * FROM made
          UNION ALL
          SELECT id, site_id, kind, slug, name FROM ctr.pages
           WHERE site_id = ${siteId} AND kind = ${kind}
          LIMIT 1
        `) as Row[]
      )[0];

    if (!row) throw new Error(`Could not find or make the ${kind} page for site ${siteId}.`);

    return {
      id: row.id,
      siteId: row.site_id,
      kind: row.kind as PageKind,
      slug: row.slug,
      name: row.name,
    };
  }
);

/** Every page of a site. */
export async function listPages(siteId: string): Promise<PageRef[]> {
  const rows = (await getSql()`
    SELECT id, site_id, kind, slug, name FROM ctr.pages
     WHERE site_id = ${siteId} ORDER BY sort_order, name
  `) as { id: string; site_id: string; kind: string; slug: string; name: string }[];

  return rows.map((row) => ({
    id: row.id,
    siteId: row.site_id,
    kind: row.kind as PageKind,
    slug: row.slug,
    name: row.name,
  }));
}

/* ─────────────────────────────── Writes ─────────────────────────────────── */

export type SiteInput = {
  slug: string;
  name: string;
  status: string;
  accent: string;
  modules: unknown;
};

/**
 * A new sport, its two pages, its modules and its chrome, in one statement.
 *
 * All of it or none: a site row with no home page is a sport whose own address
 * renders nothing and whose console screen cannot save, which is worse than the
 * create having failed outright.
 *
 * The slug is validated here as well as by the CHECK constraint in 0012,
 * because a constraint violation is an error message nobody can act on and this
 * one says which rule was broken.
 *
 * ── Why the chrome is copied rather than left blank ───────────────────────
 *
 * A sport created with an empty chrome page renders an empty navigation bar and
 * a footer with nothing above it — a broken-looking site to be repaired by hand
 * before it can be looked at, which is a poor first minute. Starting from the
 * root's means a brand-new sport already looks like the rest of the deployment
 * and the admin edits what they want to differ.
 *
 * The splash is the exception, blanked for the same reason migration 0017
 * blanked INCRC's: a full-screen cover is something a site opts into, not
 * something it inherits.
 */
export async function createSite(input: SiteInput): Promise<Site> {
  const sql = getSql();

  const slug = String(input.slug ?? "").trim().toLowerCase();
  const taken = (await listSites()).map((site) => site.slug);
  const problem = siteSlugProblem(slug, taken);
  if (problem) throw new Error(problem);

  const name = String(input.name ?? "").trim() || slug;
  const status = normaliseSiteStatus(input.status);
  const modules = normaliseModules(input.modules);
  const accent = typeof input.accent === "string" ? input.accent : "";

  /*
   * One statement, three tables. A transaction would do as well, but the site's
   * id is needed by the other two inserts and reading it back between
   * statements is the round trip a CTE avoids — and this way there is no
   * ordering to get wrong.
   */
  const rows = (await sql`
    WITH new_site AS (
      INSERT INTO ctr.sites (slug, name, kind, status, accent, sort_order)
      VALUES (${slug}, ${name}, 'sport', ${status}, ${accent},
              coalesce((SELECT max(sort_order) + 10 FROM ctr.sites), 10))
      RETURNING id
    ), new_pages AS (
      INSERT INTO ctr.pages (site_id, kind, name, sort_order)
      SELECT new_site.id, k.kind, k.name, k.ord
        FROM new_site, (VALUES ('home', ${name}, 10), ('chrome', 'Header and footer', 20))
                       AS k(kind, name, ord)
      RETURNING id, kind
    ), new_chrome AS (
      /*
       * The root's chrome, copied onto the new sport's chrome page.
       *
       * ctr.pages is read as it stood when the statement began, so this cannot
       * see the rows new_pages is inserting — which is why the destination comes
       * from the CTE above and only the SOURCE is looked up in the table.
       */
      INSERT INTO ctr.page_sections (page_id, type, "position", visible, data)
      SELECT p.id, ps.type, ps."position", ps.visible,
             /*
              * The splash arrives with the same FIELDS as the root's and none of
              * its values — not as a bare '{}'. The two mean the same thing to
              * the reader, which fills every missing field from the module's
              * blank, but only one of them survives a save unchanged: writing
              * '{}' means the very first Save rewrites the row into this shape
              * and stamps it as edited when nobody edited it.
              */
             CASE WHEN ps.type = 'splash'
                  THEN coalesce(
                         (SELECT jsonb_object_agg(field, '""'::jsonb)
                            FROM jsonb_object_keys(ps.data) AS field),
                         '{}'::jsonb)
                  ELSE ps.data END
        FROM new_pages p
        JOIN ctr.pages root_page ON root_page.kind = 'chrome'
        JOIN ctr.sites root ON root.id = root_page.site_id AND root.kind = 'root'
        JOIN ctr.page_sections ps ON ps.page_id = root_page.id
       WHERE p.kind = 'chrome'
      RETURNING 1
    ), new_modules AS (
      INSERT INTO ctr.site_modules (site_id, module)
      SELECT new_site.id, m FROM new_site, unnest(${modules}::text[]) AS m
      RETURNING 1
    )
    SELECT id FROM new_site
  `) as { id: string }[];

  const site = await getSiteFresh(rows[0].id);
  if (!site) throw new Error("The sport was created but could not be read back.");
  return site;
}

/**
 * Name, status, accent and the module list. Not the slug.
 *
 * Renaming a sport's ADDRESS would move its media folder, invalidate every
 * stored link that resolved through it and change every URL it serves. That is
 * a migration, not a form field — and unlike a deck rename there is no redirect
 * table for sites, by the decision recorded in docs/multi-sport.md.
 */
export async function updateSite(id: string, input: Omit<SiteInput, "slug">): Promise<Site | null> {
  const sql = getSql();

  const name = String(input.name ?? "").trim();
  const status = normaliseSiteStatus(input.status);
  const accent = typeof input.accent === "string" ? input.accent : "";
  const modules = normaliseModules(input.modules);

  const rows = (await sql`
    UPDATE ctr.sites
       SET name = ${name}, status = ${status}, accent = ${accent}, updated_at = now()
     WHERE id = ${id}
    RETURNING id
  `) as { id: string }[];

  if (!rows[0]) return null;

  await setModules(id, modules);
  return getSiteFresh(id);
}

/**
 * Replaces the module list wholesale.
 *
 * Switching a module OFF does not delete its records — the decks stay in the
 * table, the screen and the routes just stop being there. That is deliberate:
 * an accidental untick would otherwise be an unrecoverable delete, and a
 * switched-off module that still has rows is a state the console can report.
 */
export async function setModules(siteId: string, modules: SiteModule[]): Promise<void> {
  const sql = getSql();

  await sql.transaction([
    sql`DELETE FROM ctr.site_modules WHERE site_id = ${siteId}
         AND NOT (module = ANY(${modules}::text[]))`,
    ...modules.map(
      (module) => sql`
        INSERT INTO ctr.site_modules (site_id, module) VALUES (${siteId}, ${module})
        ON CONFLICT DO NOTHING
      `
    ),
  ]);
}

/**
 * Deletes a sport and everything on it.
 *
 * Every foreign key into a site cascades, so this takes the pages, the
 * sections, the decks, the forms, the articles, the circuits, the addresses and
 * the grants with it. The root site cannot be deleted: "/" has to resolve.
 *
 * The site's media folder is NOT touched here. That is the same ordering
 * `entityMedia` uses everywhere else — the row goes first, then the folder, so
 * a usage scan afterwards sees only foreign references. The caller does it.
 */
export async function deleteSite(id: string): Promise<boolean> {
  const sql = getSql();

  const rows = (await sql`
    DELETE FROM ctr.sites WHERE id = ${id} AND kind <> 'root' RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}

/** Uncached read, for immediately after a write — `listSites` is memoised per request. */
async function getSiteFresh(id: string): Promise<Site | null> {
  const rows = (await getSql().query(`${SELECT} WHERE s.id = $1`, [id])) as SiteRow[];
  return rows[0] ? toSite(rows[0]) : null;
}
