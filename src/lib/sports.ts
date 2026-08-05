/**
 * The verticals a post can belong to.
 *
 * `id` is what lands in the database, so these strings must stay stable.
 * A post tagged `main` shows on the landing page; every other id shows on that
 * sport's own page at `/{slug}/post`.
 */
export const SPORT_IDS = [
  "main",
  "pickleball",
  "volleyball",
  "cricket",
  "hockey",
  "f4",
  "academy",
  "karting",
  "incrc",
] as const;

export type SportId = (typeof SPORT_IDS)[number];

export const DEFAULT_SPORT: SportId = "main";

export type SportMeta = {
  id: SportId;
  /** Full name — page headings. */
  name: string;
  /** Compact name — admin badges and dropdowns. */
  short: string;
  /** Post page lives at `/{slug}/post`. Null for the main site, whose posts are on `/`. */
  slug: string | null;
  team: string;
  tagline: string;
  logo: string;
};

export const SPORTS: Record<SportId, SportMeta> = {
  main: {
    id: "main",
    name: "CTR Unified",
    short: "Main site",
    slug: null,
    team: "Sports Collective",
    tagline: "One Team. Multiple Sports. Unlimited Possibilities.",
    logo: "/media/ctr-logo.png",
  },
  pickleball: {
    id: "pickleball",
    name: "Pickleball",
    short: "Pickleball",
    slug: "pickleball",
    team: "Chennai Super Warriors",
    tagline: "Explosive hand-speed, compact court strategy, doubles chemistry.",
    logo: "/media/pickle.png",
  },
  volleyball: {
    id: "volleyball",
    name: "Volleyball",
    short: "Volleyball",
    slug: "volleyball",
    team: "Kasi Warriors",
    tagline: "Vertical athleticism and controlled transition play.",
    logo: "/media/volley.png",
  },
  cricket: {
    id: "cricket",
    name: "Cricket",
    short: "Cricket",
    slug: "cricket",
    team: "Accord Warriors",
    tagline: "Batting depth, precision bowling plans, relentless fielding.",
    logo: "/media/cricket.png",
  },
  hockey: {
    id: "hockey",
    name: "Field Hockey",
    short: "Hockey",
    slug: "hockey",
    team: "Accord Tamil Nadu Dragons",
    tagline: "Pace-driven pressing and disciplined circle execution.",
    logo: "/media/hockey.png",
  },
  f4: {
    id: "f4",
    name: "Formula 4 Racing",
    short: "F4",
    slug: "f4",
    team: "CTR Racing Development",
    tagline: "From telemetry to racecraft — the circuit talent pathway.",
    logo: "/media/ctr-f4-championship.png",
  },
  academy: {
    id: "academy",
    name: "CTR Academy",
    short: "Academy",
    slug: "academy",
    team: "Performance & Motorsport Division",
    tagline: "Motorsport science, athlete conditioning, team discipline.",
    logo: "/media/ctr-logo.png",
  },
  karting: {
    id: "karting",
    name: "CTR Karting League",
    short: "Karting League",
    slug: "karting",
    team: "Grassroots Racing Series",
    tagline: "Where young drivers build race intelligence, lap by lap.",
    logo: "/media/ctr-logo.png",
  },
  incrc: {
    id: "incrc",
    name: "Indian National Car Racing Championship",
    short: "INCRC",
    slug: "incrc",
    team: "National Circuit Program",
    tagline: "One Nation. One Championship.",
    logo: "/media/ctr-national-racing.png",
  },
};

export const SPORT_LIST: SportMeta[] = SPORT_IDS.map((id) => SPORTS[id]);

/**
 * Which sports actually have a `/{slug}/post` route built. Every id above is
 * valid to tag a post with, but only these have somewhere to show it.
 *
 * Adding a page means adding its route file AND its id here — the sitemap reads
 * this list, so leaving it out means the page never gets indexed.
 */
export const BUILT_SPORT_PAGES: SportId[] = ["volleyball", "cricket", "academy", "karting"];

export function isSportId(value: unknown): value is SportId {
  return typeof value === "string" && (SPORT_IDS as readonly string[]).includes(value);
}

/** Anything unrecognised falls back to the main site, so old rows are never orphaned. */
export function resolveSport(value: unknown): SportMeta {
  return SPORTS[isSportId(value) ? value : DEFAULT_SPORT];
}

/** The page a post with this sport appears on — what writes need to revalidate. */
export function sportPostsPath(value: unknown): string {
  const { slug } = resolveSport(value);
  return slug ? `/${slug}/post` : "/";
}
