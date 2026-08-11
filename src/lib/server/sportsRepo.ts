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
    sort_order: row.sort_order,
    is_visible: row.is_visible,
  };
}

/** Everything, hidden cards included — this is the admin's list. */
export async function listAllSports(): Promise<Sport[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, text, details, logo_url, sort_order, is_visible
      FROM ctr_sports
     ORDER BY sort_order ASC, title ASC
  `) as Row[];

  return rows.map(toSport);
}

/** Only what the landing page should show. */
export async function listVisibleSports(): Promise<Sport[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, text, details, logo_url, sort_order, is_visible
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
    INSERT INTO ctr_sports (title, text, details, logo_url, sort_order, is_visible)
    VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
            ${sport.sort_order}, ${sport.is_visible})
    RETURNING id, title, text, details, logo_url, sort_order, is_visible
  `) as Row[];

  return toSport(rows[0]);
}

/** Null when the id does not exist — the route turns that into a 404. */
export async function updateSport(id: string, input: unknown): Promise<Sport | null> {
  const sql = getSql();
  const sport = normaliseSportInput(input);

  const rows = (await sql`
    UPDATE ctr_sports
       SET title      = ${sport.title},
           text       = ${sport.text},
           details    = ${sport.details},
           logo_url   = ${sport.logo_url},
           sort_order = ${sport.sort_order},
           is_visible = ${sport.is_visible},
           updated_at = now()
     WHERE id = ${id}
    RETURNING id, title, text, details, logo_url, sort_order, is_visible
  `) as Row[];

  return rows[0] ? toSport(rows[0]) : null;
}

export async function deleteSport(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_sports WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
