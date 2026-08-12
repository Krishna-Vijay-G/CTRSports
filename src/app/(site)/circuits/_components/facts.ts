import { formerNameList, type Track } from "@/lib/tracks";

/**
 * The circuit's record, as the rows of a table.
 *
 * Built here rather than written out in the page so the same list feeds the
 * detail page, the admin preview and anything that comes later — and so a blank
 * field is dropped in exactly one place. A record with half its rows reading
 * "—" looks unfinished; one with six real rows looks complete, which is what a
 * circuit that has only been half filled in should look like.
 *
 * The order is the order a motorsport reader wants it: what the lap is like
 * first, then the licence, then the history, then the paperwork.
 */

export type Fact = {
  label: string;
  value: string;
  /** Set on the two or three worth reading at a glance. */
  lead?: boolean;
  /**
   * Words, not a measurement — so the display must not try to set a number
   * large and a unit small. "13°0′9″N 79°59′9″E" begins with a digit and would
   * otherwise be split into a giant 13 and a whisper of the rest.
   */
  plain?: boolean;
};

export function circuitFacts(track: Track): Fact[] {
  const facts: Fact[] = [
    { label: "Circuit length", value: track.length, lead: true },
    { label: "Turns", value: track.turns, lead: true },
    { label: "Lap record", value: lapRecord(track), lead: true },
    { label: "Races held", value: track.races_held > 0 ? String(track.races_held) : "" },
    { label: "FIA grade", value: track.fia_grade },
    { label: "Direction", value: track.direction, plain: true },
    { label: "Opened", value: track.opened },
    { label: "Broke ground", value: track.broke_ground },
    { label: "Capacity", value: track.capacity },
    { label: "Owner", value: track.owner, plain: true },
    { label: "Former names", value: formerNameList(track).join(" · "), plain: true },
    { label: "Coordinates", value: track.coordinates, plain: true },
  ];

  return facts.filter((fact) => fact.value.trim() !== "");
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

/** The handful pulled out of the record and set large above it. */
export function leadFacts(track: Track): Fact[] {
  return circuitFacts(track).filter((fact) => fact.lead);
}

/**
 * A measurement split into the number and everything after it.
 *
 * The whole look of this page rests on it: "3.717 km (2.310 mi)" set as one
 * string at one size is a line of text, and the same value set as a large
 * **3.717** with a small *km (2.310 mi)* beside it is a readout. Every value in
 * this table is free text typed by a person, so the split is done on what is
 * there rather than on a unit column that does not exist.
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
