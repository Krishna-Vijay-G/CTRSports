import "server-only";

import { getSql } from "@/lib/server/db";
import type { Track } from "@/lib/tracks";

/**
 * Every read of ctr_tracks.
 *
 * Reads only, for now: circuits are edited on a screen of their own that does
 * not exist yet. When it does, the writes belong here beside these.
 */

type Row = {
  id: string;
  name: string;
  location: string;
  map_url: string;
  length: string;
  turns: string;
  note: string;
  sort_order: number;
};

export async function listTracks(): Promise<Track[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, location, map_url, length, turns, note, sort_order
      FROM ctr_tracks
     ORDER BY sort_order ASC, name ASC
  `) as Row[];

  return rows;
}

/**
 * Same, but an unreachable database yields an empty list instead of throwing.
 *
 * The calendar has to render without circuits: a round falls back to the venue
 * and city typed on it, so the season is still readable when the tracks table
 * cannot be reached — it simply loses the maps.
 */
export async function listTracksSafe(): Promise<Track[]> {
  try {
    return await listTracks();
  } catch (error) {
    console.error("[tracks] could not load circuits", error);
    return [];
  }
}
