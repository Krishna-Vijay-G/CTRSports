import { formerNameList, type Track } from "@/lib/tracks";

/**
 * The circuit's record, split by how much room each fact deserves.
 *
 * The split is the whole point, and it comes from how the sport itself prints
 * this. Formula 1's own circuit guides carry five labelled facts — circuit
 * length, number of turns, number of laps, race distance, lap record — and they
 * are set as one compact strip, not as five panels. A value two characters long
 * given a panel of its own reads as an empty panel; the same value in a divided
 * row reads as a readout.
 *
 * So:
 *
 *   headlineFacts   the numbers that describe the lap. Few, short, comparable —
 *                   one divided strip under the title.
 *   detailFacts     everything else. Longer, read once, and only by someone who
 *                   went looking — a plain two-column table.
 *
 * Nothing appears in both. A fact printed twice is the other way to waste a
 * screen.
 *
 * Blank fields are dropped rather than printed as dashes, in both lists: a
 * record with half its rows empty looks broken, and a short one merely looks
 * short — which is what a half-filled circuit should look like.
 */

export type Fact = {
  label: string;
  value: string;
  /**
   * Words, not a measurement — so the display must not try to set a number
   * large and a unit small. "13°0′9″N 79°59′9″E" begins with a digit and would
   * otherwise be split into a giant 13 and a whisper of the rest.
   */
  plain?: boolean;
};

/** The strip. Four at most, so it divides cleanly at every width. */
export function headlineFacts(track: Track): Fact[] {
  return [
    { label: "Circuit length", value: track.length },
    { label: "Turns", value: track.turns },
    { label: "Lap record", value: lapRecord(track) },
    { label: "Races held", value: track.races_held > 0 ? String(track.races_held) : "" },
  ].filter((fact) => fact.value.trim() !== "");
}

/** The table. Everything the strip did not take. */
export function detailFacts(track: Track): Fact[] {
  return [
    { label: "FIA grade", value: track.fia_grade },
    { label: "Direction", value: track.direction, plain: true },
    { label: "Opened", value: track.opened },
    { label: "Broke ground", value: track.broke_ground },
    { label: "Capacity", value: track.capacity },
    { label: "Owner", value: track.owner, plain: true },
    { label: "Former names", value: formerNameList(track).join(" · "), plain: true },
    { label: "Coordinates", value: track.coordinates, plain: true },
  ].filter((fact) => fact.value.trim() !== "");
}

/**
 * "1:30.323 (2020)" — the time, and the year it was set.
 *
 * WHO set it and in WHAT are missing on purpose: a driver and a car are a racer
 * and a team, and those get tables of their own. A name typed into this string
 * would have to be unpicked into a foreign key the day they exist.
 */
export function lapRecord(track: Track): string {
  if (!track.lap_record_time) return "";
  return track.lap_record_year
    ? `${track.lap_record_time} (${track.lap_record_year})`
    : track.lap_record_time;
}

/**
 * A measurement split into the number and everything after it.
 *
 * "3.717 km (2.310 mi)" set as one string at one size is a line of text; the
 * same value as a large **3.717** with a small *km (2.310 mi)* beside it is a
 * readout. Every value here is free text typed by a person, so the split is done
 * on what is there rather than on a unit column that does not exist.
 *
 * Anything not beginning with a digit — and anything marked `plain` — comes back
 * whole, for the caller to set at whatever size prose deserves.
 */
export function splitFact(fact: Fact): { head: string; tail: string; numeric: boolean } {
  const value = fact.value.trim();

  if (fact.plain) return { head: value, tail: "", numeric: false };

  const match = /^(\d[\d.,:]*)\s*(.*)$/.exec(value);
  if (!match) return { head: value, tail: "", numeric: false };

  return { head: match[1], tail: match[2], numeric: true };
}
