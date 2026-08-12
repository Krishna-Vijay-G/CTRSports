/**
 * A circuit: one row of `ctr_tracks`.
 *
 * A table rather than a field on the round, because a circuit outlives the
 * season that visits it. The same track is raced on twice in a year and again
 * next year, and its map, its length and its corner count do not change when the
 * calendar does. Rounds point at it by id.
 *
 * The map itself is edited on a screen of its own — see the note in the admin's
 * calendar panel — so nothing here assumes it is drawn by hand.
 *
 * Shared by the server (repo) and the browser (admin), so nothing in here may
 * import `server-only`.
 */

export type Track = {
  id: string;
  /** "Kari Motor Speedway". */
  name: string;
  /** Where it is, as one line — "Coimbatore, Tamil Nadu". */
  location: string;
  /** The layout drawing. Absolute URL or a /public path; blank draws none. */
  map_url: string;
  /** Free text, so "3.71 km" and "3,710 m" are both sayable. */
  length: string;
  /** Free text for the same reason — "12", "12 (7 right)". */
  turns: string;
  /** One line on what the circuit is like. */
  note: string;
  /** Ascending. Ties fall back to name. */
  sort_order: number;
};

export const TRACK_LIMITS = {
  name: 120,
  location: 120,
  map_url: 500,
  length: 40,
  turns: 40,
  note: 300,
} as const;

/** What a new circuit starts from. */
export const BLANK_TRACK: Omit<Track, "id"> = {
  name: "",
  location: "",
  map_url: "",
  length: "",
  turns: "",
  note: "",
  sort_order: 0,
};

/**
 * Seeded into an empty table by `npm run migrate`, so the calendar has circuits
 * to point at on a fresh database. Taken from the venues already on the page.
 */
export const SEED_TRACKS: Omit<Track, "id">[] = [
  {
    name: "Kari Motor Speedway",
    location: "Coimbatore, Tamil Nadu",
    // Public domain, from Wikimedia. Small, so replace it with a better one.
    map_url: "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20200907014213_Kari-Motor-Speedway-upgrades-1.jpg",
    length: "2.10 km",
    turns: "10",
    note: "The home of Indian motorsport — tight, technical and unforgiving.",
    sort_order: 10,
  },
  {
    name: "Bren Raceway",
    location: "Doddaballapura, Bengaluru",
    map_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJqHEDj58zIR2oJEUa-EON-z44C2RuwoFAFAj4l7_b8vKLRvhrz1zTHbkg&s=10",
    length: "4.10 km",
    turns: "14",
    note: "India's newest permanent circuit, fast and flowing throughout.",
    sort_order: 20,
  },
  {
    name: "Madras International Circuit",
    location: "Irungattukottai, Chennai",
    // CC BY-SA 3.0, from Wikimedia — attribution is owed if this one stays.
    map_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240920010433_Madras_international_karting_arena.jpg",
    length: "3.71 km",
    turns: "12",
    note: "A long back straight into a hairpin — the season's decider.",
    sort_order: 30,
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as sports: a malformed id should 404, not blow up Postgres. */
export function isTrackId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Clamps whatever came off the wire into a storable circuit. */
export function normaliseTrackInput(input: unknown): Omit<Track, "id"> {
  const record = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;

  const str = (value: unknown, max: number): string =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const order = Number(record.sort_order);

  return {
    name: str(record.name, TRACK_LIMITS.name),
    location: str(record.location, TRACK_LIMITS.location),
    map_url: normaliseTrackMap(record.map_url),
    length: str(record.length, TRACK_LIMITS.length),
    turns: str(record.turns, TRACK_LIMITS.turns),
    note: str(record.note, TRACK_LIMITS.note),
    sort_order: Number.isFinite(order) ? Math.trunc(order) : 0,
  };
}

/** A /public path or an http(s) URL. Anything else becomes no map at all. */
export function normaliseTrackMap(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().slice(0, TRACK_LIMITS.map_url);
  if (!trimmed || trimmed.startsWith("//")) return "";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}

/** The circuit a round points at, or undefined when it points at nothing. */
export function findTrack(tracks: Track[], id: string): Track | undefined {
  return id ? tracks.find((track) => track.id === id) : undefined;
}
