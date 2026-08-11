/**
 * The one database-backed thing on the site: a sport card.
 *
 * Four editable fields, on purpose — logo, title, text, details. Anything more
 * belongs in src/config/site.ts, where it is a code change and a deploy.
 *
 * Shared by the server (repo, API routes) and the browser (admin dashboard), so
 * nothing in here may import `server-only`.
 */

export type Sport = {
  id: string;
  /** Sport name — "Cricket", "Formula 4 Racing". */
  title: string;
  /** The line under the title. Usually the team name. */
  text: string;
  /** The paragraph under that. */
  details: string;
  /** Absolute URL (S3) or a /public path. */
  logo_url: string;
  /** Ascending. Ties fall back to title. */
  sort_order: number;
  /** Unchecked hides the card from the landing page without deleting it. */
  is_visible: boolean;
};

/** What the admin's "Add sport" button starts from. */
export const BLANK_SPORT: Omit<Sport, "id"> = {
  title: "",
  text: "",
  details: "",
  logo_url: "",
  sort_order: 0,
  is_visible: true,
};

export const LIMITS = {
  title: 80,
  text: 120,
  details: 600,
  logo_url: 500,
} as const;

/**
 * Seeded into an empty table by `npm run migrate`, so a fresh database renders a
 * complete page and the admin opens on something to edit rather than a void.
 * After that first insert this list is never consulted again — the table is the
 * source of truth.
 */
export const SEED_SPORTS: Omit<Sport, "id">[] = [
  {
    title: "Pickleball",
    text: "Chennai Super Warriors",
    details:
      "Explosive hand-speed, compact court strategy, and doubles chemistry define CTR's pickleball identity.",
    logo_url: "/images/sports/pickleball.webp",
    sort_order: 10,
    is_visible: true,
  },
  {
    title: "Volleyball",
    text: "Kasi Warriors",
    details:
      "Vertical athleticism and controlled transition play power our volleyball program across elite competitions.",
    logo_url: "/images/sports/volleyball.webp",
    sort_order: 20,
    is_visible: true,
  },
  {
    title: "Cricket",
    text: "Accord Warriors",
    details:
      "Structured batting depth, precision bowling plans, and relentless fielding standards anchor this unit.",
    logo_url: "/images/sports/cricket.webp",
    sort_order: 30,
    is_visible: true,
  },
  {
    title: "Field Hockey",
    text: "Accord Tamil Nadu Dragons",
    details:
      "Pace-driven pressing and disciplined circle execution make our hockey program sharp and competitive.",
    logo_url: "/images/sports/hockey.webp",
    sort_order: 40,
    is_visible: true,
  },
  {
    title: "Formula 4 Racing",
    text: "CTR Racing Development",
    details:
      "From telemetry to racecraft, the F4 pathway develops next-generation circuit talent with measurable rigor.",
    logo_url: "/images/sports/formula-4.webp",
    sort_order: 50,
    is_visible: true,
  },
  {
    title: "Indian National Car Racing Championship",
    text: "National Circuit Program",
    details:
      "A professional national ladder connecting karting graduates to full circuit competition under one unified banner.",
    logo_url: "/images/sports/national-racing.webp",
    sort_order: 60,
    is_visible: true,
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids come out of the URL, so they are whatever was typed. Checking the shape
 * before it reaches Postgres turns a `uuid` type error — which surfaces as a
 * 500 — into an ordinary 404.
 */
export function isSportId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Clamps whatever came off the wire into a storable shape. Runs on every write,
 * so an over-long paste or a wrong-typed field is trimmed rather than rejected —
 * with one exception: a card with no title is not a card, and the caller
 * rejects it.
 */
export function normaliseSportInput(input: unknown): Omit<Sport, "id"> {
  const record = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;

  const str = (value: unknown, max: number): string =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const order = Number(record.sort_order);

  return {
    title: str(record.title, LIMITS.title),
    text: str(record.text, LIMITS.text),
    details: str(record.details, LIMITS.details),
    logo_url: normaliseLogoUrl(record.logo_url),
    sort_order: Number.isFinite(order) ? Math.trunc(order) : 0,
    // Anything other than an explicit `false` means visible.
    is_visible: record.is_visible !== false,
  };
}

/**
 * A logo is either a /public path or an http(s) URL. Anything else — a bare
 * filename, a `javascript:` payload, a protocol-relative `//host` — becomes
 * empty, which the card renders as a plain placeholder instead of a broken or
 * dangerous image.
 */
export function normaliseLogoUrl(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().slice(0, LIMITS.logo_url);
  if (!trimmed || trimmed.startsWith("//")) return "";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}
