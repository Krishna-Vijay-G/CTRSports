/**
 * A sport card: one row of `ctr.sports`, edited at /admin/sports.
 *
 * The rest of the landing page is a single JSONB document — see
 * src/lib/landingContent.ts. Sports are rows instead because they are a list
 * that gets added to, reordered and deleted, which is what a table is for.
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
  /** Crest. Absolute URL (S3) or a /public path. */
  logo_url: string;
  /** The photograph behind the crest on the card. Same rules as logo_url. */
  photo_url: string;
  /**
   * Where the card goes when it is clicked — a path on this site (`/incrc`), an
   * anchor (`#sports`) or a full URL. Blank leaves the card as a plain card,
   * which is what a sport with nowhere to go should be.
   */
  href: string;
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
  photo_url: "",
  href: "",
  sort_order: 0,
  is_visible: true,
};

export const LIMITS = {
  title: 80,
  text: 120,
  details: 600,
  logo_url: 500,
  photo_url: 500,
  href: 500,
} as const;

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
    logo_url: normaliseImageUrl(record.logo_url),
    photo_url: normaliseImageUrl(record.photo_url),
    href: normaliseHref(record.href),
    sort_order: Number.isFinite(order) ? Math.trunc(order) : 0,
    // Anything other than an explicit `false` means visible.
    is_visible: record.is_visible !== false,
  };
}

/**
 * An image is either a /public path or an http(s) URL. Anything else — a bare
 * filename, a `javascript:` payload, a protocol-relative `//host` — becomes
 * empty, which the card renders as a plain placeholder instead of a broken or
 * dangerous image.
 */
export function normaliseImageUrl(value: unknown): string {
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

/**
 * Where a card may point: a path on this site, an in-page anchor, or an http(s)
 * URL. Everything else — `javascript:` above all, but also a protocol-relative
 * `//host` — becomes empty, and an empty href is what makes the card render as
 * plain markup rather than as a link.
 *
 * The same rule as an image, plus anchors: a card pointing at `#sports` is a
 * reasonable thing to want, and is not a picture.
 */
export function normaliseHref(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().slice(0, LIMITS.href);
  if (!trimmed || trimmed.startsWith("//")) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}
