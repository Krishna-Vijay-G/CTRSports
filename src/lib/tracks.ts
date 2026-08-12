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

  /* ── Pictures ── */
  /** A photograph of the circuit. What the calendar puts behind the next round. */
  photo_url: string;
  /** A drawing of the layout, as a raster image. Blank draws none. */
  map_url: string;
  /**
   * The layout as vector path data — the `d` of a single <path>.
   *
   * Preferred over map_url wherever it is set: it takes the page's colours, so
   * the outline is drawn in the accent rather than being a picture of a drawing.
   */
  svg_path: string;
  /** The coordinate space `svg_path` was drawn in. Defaults to `0 0 400 260`. */
  svg_view_box: string;

  /* ── The record ── */
  /** Free text, so "3.717 km (2.310 mi)" survives intact. */
  length: string;
  /** Free text for the same reason — "17", "12 (7 right)". */
  turns: string;
  /** "Clockwise" / "Anti-clockwise". */
  direction: string;
  /** Year, as text: a circuit opens in "1990" but also in "2010 (rebuilt)". */
  opened: string;
  broke_ground: string;
  /** "Madras Motor Race Track; Irungattukottai Race Track". */
  former_names: string;
  owner: string;
  /** "1", "2", "3" — the FIA's licence grade. */
  fia_grade: string;
  /** "13°0′9″N 79°59′9″E". Text, because that is how a circuit quotes them. */
  coordinates: string;
  capacity: string;
  website: string;
  /** The championships it hosts, one per line. */
  major_events: string;
  /** How many races have been run here. A real count, so it can be summed. */
  races_held: number;
  /**
   * The outright lap record.
   *
   * The time and the year only. WHO set it and in WHAT are a racer and a team,
   * and they get tables of their own — a name typed in here would have to be
   * unpicked into a foreign key the moment those exist.
   */
  lap_record_time: string;
  lap_record_year: string;

  /** One line on what the circuit is like. */
  note: string;
  /** Ascending. Ties fall back to name. */
  sort_order: number;
};

export const TRACK_LIMITS = {
  name: 120,
  location: 120,
  photo_url: 500,
  map_url: 500,
  svg_path: 20_000,
  svg_view_box: 60,
  length: 60,
  turns: 60,
  direction: 40,
  opened: 40,
  broke_ground: 40,
  former_names: 200,
  owner: 120,
  fia_grade: 20,
  coordinates: 80,
  capacity: 60,
  website: 300,
  major_events: 600,
  lap_record_time: 40,
  lap_record_year: 20,
  note: 300,
} as const;

/** The coordinate space a hand-drawn outline is assumed to use. */
export const DEFAULT_VIEW_BOX = "0 0 400 260";

/** What a new circuit starts from. */
export const BLANK_TRACK: Omit<Track, "id"> = {
  name: "",
  location: "",
  photo_url: "",
  map_url: "",
  svg_path: "",
  svg_view_box: DEFAULT_VIEW_BOX,
  length: "",
  turns: "",
  direction: "",
  opened: "",
  broke_ground: "",
  former_names: "",
  owner: "",
  fia_grade: "",
  coordinates: "",
  capacity: "",
  website: "",
  major_events: "",
  races_held: 0,
  lap_record_time: "",
  lap_record_year: "",
  note: "",
  sort_order: 0,
};

/**
 * Seeded into an empty table by `npm run migrate`, so the calendar has circuits
 * to point at on a fresh database. Taken from the venues already on the page.
 */
export const SEED_TRACKS: Omit<Track, "id">[] = [
  {
    ...BLANK_TRACK,
    name: "Kari Motor Speedway",
    location: "Coimbatore, Tamil Nadu",
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20200907014213_Kari-Motor-Speedway-upgrades-1.jpg",
    length: "2.10 km",
    turns: "10",
    direction: "Clockwise",
    opened: "2003",
    owner: "Kari Motor Speedway Pvt Ltd",
    fia_grade: "3",
    major_events: ["Indian Racing League", "MRF Formula 2000", "F4 India"].join("\n"),
    note: "The home of Indian motorsport — tight, technical and unforgiving.",
    sort_order: 10,
  },
  {
    ...BLANK_TRACK,
    name: "Bren Raceway",
    location: "Doddaballapura, Bengaluru",
    photo_url:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJqHEDj58zIR2oJEUa-EON-z44C2RuwoFAFAj4l7_b8vKLRvhrz1zTHbkg&s=10",
    length: "4.10 km",
    turns: "14",
    direction: "Anti-clockwise",
    fia_grade: "2",
    note: "India's newest permanent circuit, fast and flowing throughout.",
    sort_order: 20,
  },
  {
    ...BLANK_TRACK,
    name: "Madras International Circuit",
    location: "Irungattukottai, Chennai",
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240920010433_Madras_international_karting_arena.jpg",
    length: "3.717 km (2.310 mi)",
    turns: "17",
    direction: "Clockwise",
    opened: "1990",
    broke_ground: "1988",
    former_names: "Madras Motor Race Track; Irungattukottai Race Track",
    owner: "Madras Motor Sports Club",
    fia_grade: "2",
    coordinates: "13°0′9″N 79°59′9″E",
    website: "https://en.madrasmotorsports.com",
    major_events: [
      "MRF Formula 2000",
      "Indian Racing League",
      "F4 India",
      "F4 SEA",
      "Asia Road Racing Championship",
      "Asian F3",
    ].join("\n"),
    lap_record_time: "1:30.323",
    lap_record_year: "2020",
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
  const races = Number(record.races_held);

  return {
    name: str(record.name, TRACK_LIMITS.name),
    location: str(record.location, TRACK_LIMITS.location),

    photo_url: normaliseTrackMap(record.photo_url),
    map_url: normaliseTrackMap(record.map_url),
    svg_path: normaliseSvgPath(record.svg_path),
    svg_view_box: str(record.svg_view_box, TRACK_LIMITS.svg_view_box) || DEFAULT_VIEW_BOX,

    length: str(record.length, TRACK_LIMITS.length),
    turns: str(record.turns, TRACK_LIMITS.turns),
    direction: str(record.direction, TRACK_LIMITS.direction),
    opened: str(record.opened, TRACK_LIMITS.opened),
    broke_ground: str(record.broke_ground, TRACK_LIMITS.broke_ground),
    former_names: str(record.former_names, TRACK_LIMITS.former_names),
    owner: str(record.owner, TRACK_LIMITS.owner),
    fia_grade: str(record.fia_grade, TRACK_LIMITS.fia_grade),
    coordinates: str(record.coordinates, TRACK_LIMITS.coordinates),
    capacity: str(record.capacity, TRACK_LIMITS.capacity),
    website: normaliseTrackMap(record.website),
    major_events: str(record.major_events, TRACK_LIMITS.major_events),
    races_held: Number.isFinite(races) ? Math.max(0, Math.trunc(races)) : 0,
    lap_record_time: str(record.lap_record_time, TRACK_LIMITS.lap_record_time),
    lap_record_year: str(record.lap_record_year, TRACK_LIMITS.lap_record_year),

    note: str(record.note, TRACK_LIMITS.note),
    sort_order: Number.isFinite(order) ? Math.trunc(order) : 0,
  };
}

/**
 * The `d` of a single <path>, with everything that is not path data removed.
 *
 * This value is dropped straight into an SVG that the page renders, so it is
 * held to the alphabet a path is made of: the command letters, digits, and the
 * separators between them. A `<` cannot survive that filter, which is what makes
 * pasting a whole SVG file in here — or anything worse — harmless rather than an
 * injection. The paste simply does not draw, and the field says so.
 */
export function normaliseSvgPath(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().slice(0, TRACK_LIMITS.svg_path);
  if (!trimmed) return "";

  const cleaned = trimmed.replace(/[^MmZzLlHhVvCcSsQqTtAa0-9.,\-+eE\s]/g, "").trim();

  // A path that does not begin with a move is not a path.
  return /^[Mm]/.test(cleaned) ? cleaned : "";
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
