import "server-only";

import { getSql } from "@/lib/server/db";
import { normaliseSportInput, type Sport } from "@/lib/sports";

/**
 * Every read and write of ctr_sports. The column list is spelled out in each
 * query rather than shared through a helper — five queries repeating six column
 * names is easier to follow than one clever builder.
 */

type Row = {
  id: string;
  title: string;
  text: string;
  details: string;
  logo_url: string;
  photo_url: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
};

function toSport(row: Row): Sport {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    details: row.details,
    logo_url: row.logo_url,
    photo_url: row.photo_url,
    href: row.href,
    sort_order: row.sort_order,
    is_visible: row.is_visible,
  };
}

/** Everything, hidden cards included — this is the admin's list. */
export async function listAllSports(): Promise<Sport[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, text, details, logo_url, photo_url, href, sort_order, is_visible
      FROM ctr_sports
     ORDER BY sort_order ASC, title ASC
  `) as Row[];

  return rows.map(toSport);
}

/** Only what the landing page should show. */
export async function listVisibleSports(): Promise<Sport[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, text, details, logo_url, photo_url, href, sort_order, is_visible
      FROM ctr_sports
     WHERE is_visible = true
     ORDER BY sort_order ASC, title ASC
  `) as Row[];

  return rows.map(toSport);
}

/**
 * Same, but an unreachable database yields an empty list instead of throwing.
 * The landing page has to render even when Neon does not answer — the sports
 * section simply drops out rather than taking the page down.
 */
export async function listVisibleSportsSafe(): Promise<Sport[]> {
  try {
    return await listVisibleSports();
  } catch (error) {
    console.error("[sports] could not load sports", error);
    return [];
  }
}

export async function createSport(input: unknown): Promise<Sport> {
  const sql = getSql();
  const sport = normaliseSportInput(input);

  const rows = (await sql`
    INSERT INTO ctr_sports (title, text, details, logo_url, photo_url, href, sort_order, is_visible)
    VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
            ${sport.photo_url}, ${sport.href}, ${sport.sort_order}, ${sport.is_visible})
    RETURNING id, title, text, details, logo_url, photo_url, href, sort_order, is_visible
  `) as Row[];

  return toSport(rows[0]);
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * Deliberately does NOT write sort_order. Position is owned entirely by
 * `reorderSports`, so a form that was opened before someone dragged the list
 * cannot save a stale position back over it.
 */
export async function updateSport(id: string, input: unknown): Promise<Sport | null> {
  const sql = getSql();
  const sport = normaliseSportInput(input);

  const rows = (await sql`
    UPDATE ctr_sports
       SET title      = ${sport.title},
           text       = ${sport.text},
           details    = ${sport.details},
           logo_url   = ${sport.logo_url},
           photo_url  = ${sport.photo_url},
           href       = ${sport.href},
           is_visible = ${sport.is_visible},
           updated_at = now()
     WHERE id = ${id}
    RETURNING id, title, text, details, logo_url, photo_url, href, sort_order, is_visible
  `) as Row[];

  return rows[0] ? toSport(rows[0]) : null;
}

/**
 * Rewrites every card's position from the order of `ids`.
 *
 * Spaced by ten so a row can still be nudged between two others by hand in SQL
 * if it ever comes to that. One transaction, so a half-applied order cannot be
 * left behind if a statement fails partway down the list.
 *
 * Ids not in the list are left alone; the caller sends the whole list.
 */
export async function reorderSports(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();

  await sql.transaction(
    ids.map(
      (id, index) => sql`
        UPDATE ctr_sports
           SET sort_order = ${(index + 1) * 10}, updated_at = now()
         WHERE id = ${id}
      `
    )
  );
}

export async function deleteSport(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_sports WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
