import "server-only";

import { getSql } from "@/lib/server/db";
import { normaliseTrackInput, type Track } from "@/lib/tracks";

/**
 * Every read and write of ctr_tracks.
 *
 * The column list is spelled out in each query rather than shared through a
 * helper, the same way sportsRepo does it: a handful of queries repeating the
 * names is easier to follow than one builder that hides them.
 */

export async function listTracks(): Promise<Track[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, location, photo_url, map_url, svg_path, svg_view_box,
           length, turns, direction, opened, broke_ground, former_names, owner,
           fia_grade, coordinates, capacity, links, major_events, races_held,
           lap_record_time, lap_record_year, note, sort_order
      FROM ctr_tracks
     ORDER BY sort_order ASC, name ASC
  `) as Track[];

  return rows;
}

/**
 * Same, but an unreachable database yields an empty list instead of throwing.
 *
 * The calendar has to render without circuits: a round falls back to the venue
 * and city typed on it, so the season is still readable when the tracks table
 * cannot be reached — it simply loses the pictures.
 */
export async function listTracksSafe(): Promise<Track[]> {
  try {
    return await listTracks();
  } catch (error) {
    console.error("[tracks] could not load circuits", error);
    return [];
  }
}

export async function createTrack(input: unknown): Promise<Track> {
  const sql = getSql();
  const t = normaliseTrackInput(input);

  const rows = (await sql`
    INSERT INTO ctr_tracks (
      name, location, photo_url, map_url, svg_path, svg_view_box,
      length, turns, direction, opened, broke_ground, former_names, owner,
      fia_grade, coordinates, capacity, links, major_events, races_held,
      lap_record_time, lap_record_year, note, sort_order
    )
    VALUES (
      ${t.name}, ${t.location}, ${t.photo_url}, ${t.map_url}, ${t.svg_path}, ${t.svg_view_box},
      ${t.length}, ${t.turns}, ${t.direction}, ${t.opened}, ${t.broke_ground},
      ${t.former_names}, ${t.owner}, ${t.fia_grade}, ${t.coordinates}, ${t.capacity},
      ${JSON.stringify(t.links)}::jsonb, ${t.major_events}, ${t.races_held},
      ${t.lap_record_time}, ${t.lap_record_year}, ${t.note}, ${t.sort_order}
    )
    RETURNING id, name, location, photo_url, map_url, svg_path, svg_view_box,
              length, turns, direction, opened, broke_ground, former_names, owner,
              fia_grade, coordinates, capacity, links, major_events, races_held,
              lap_record_time, lap_record_year, note, sort_order
  `) as Track[];

  return rows[0];
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * Deliberately does NOT write sort_order, for the same reason sports does not:
 * position is owned by `reorderTracks`, so a form opened before someone dragged
 * the list cannot save a stale position back over it.
 */
export async function updateTrack(id: string, input: unknown): Promise<Track | null> {
  const sql = getSql();
  const t = normaliseTrackInput(input);

  const rows = (await sql`
    UPDATE ctr_tracks
       SET name            = ${t.name},
           location        = ${t.location},
           photo_url       = ${t.photo_url},
           map_url         = ${t.map_url},
           svg_path        = ${t.svg_path},
           svg_view_box    = ${t.svg_view_box},
           length          = ${t.length},
           turns           = ${t.turns},
           direction       = ${t.direction},
           opened          = ${t.opened},
           broke_ground    = ${t.broke_ground},
           former_names    = ${t.former_names},
           owner           = ${t.owner},
           fia_grade       = ${t.fia_grade},
           coordinates     = ${t.coordinates},
           capacity        = ${t.capacity},
           links           = ${JSON.stringify(t.links)}::jsonb,
           major_events    = ${t.major_events},
           races_held      = ${t.races_held},
           lap_record_time = ${t.lap_record_time},
           lap_record_year = ${t.lap_record_year},
           note            = ${t.note},
           updated_at      = now()
     WHERE id = ${id}
    RETURNING id, name, location, photo_url, map_url, svg_path, svg_view_box,
              length, turns, direction, opened, broke_ground, former_names, owner,
              fia_grade, coordinates, capacity, links, major_events, races_held,
              lap_record_time, lap_record_year, note, sort_order
  `) as Track[];

  return rows[0] ?? null;
}

/** Spaced by ten, one transaction — the same rule the sports list follows. */
export async function reorderTracks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();

  await sql.transaction(
    ids.map(
      (id, index) => sql`
        UPDATE ctr_tracks
           SET sort_order = ${(index + 1) * 10}, updated_at = now()
         WHERE id = ${id}
      `
    )
  );
}

/**
 * Rounds point at circuits by id, and a round whose circuit has gone falls back
 * to the venue text typed on it — so a delete degrades the calendar rather than
 * breaking it. Nothing here has to go and rewrite the incrc document.
 */
export async function deleteTrack(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_tracks WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
