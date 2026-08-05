/**
 * The racing categories a driver can register for.
 *
 * `id` is what lands in the database, so these strings must stay stable. This
 * is the single source for the category list — the "Race With CTR" slide on
 * `/academy` and the registration form at `/academy/registration` both read
 * from `RACE_CATEGORY_LIST` rather than keeping their own copy.
 */
export const RACE_CATEGORY_IDS = [
  "super-touring",
  "touring",
  "junior-touring",
  "super-stock",
  "levitas-rookie",
  "levitas-gentlemen",
  "flgb4",
  "formula-1300",
] as const;

export type RaceCategoryId = (typeof RACE_CATEGORY_IDS)[number];

export type RaceCategoryMeta = {
  id: RaceCategoryId;
  name: string;
  rounds: number;
  races: number;
};

export const RACE_CATEGORIES: Record<RaceCategoryId, RaceCategoryMeta> = {
  "super-touring": { id: "super-touring", name: "Indian Super Touring Cars", rounds: 3, races: 10 },
  touring: { id: "touring", name: "Indian Touring Cars", rounds: 3, races: 10 },
  "junior-touring": { id: "junior-touring", name: "Indian Junior Touring Cars", rounds: 3, races: 10 },
  "super-stock": { id: "super-stock", name: "Super Stock", rounds: 3, races: 10 },
  "levitas-rookie": { id: "levitas-rookie", name: "Levitas Cup Rookie", rounds: 4, races: 10 },
  "levitas-gentlemen": { id: "levitas-gentlemen", name: "Levitas Cup Gentlemen", rounds: 4, races: 10 },
  flgb4: { id: "flgb4", name: "Formula LGB F4 (FLGB4)", rounds: 4, races: 10 },
  "formula-1300": { id: "formula-1300", name: "Formula 1300 – TBA", rounds: 4, races: 10 },
};

export const RACE_CATEGORY_LIST: RaceCategoryMeta[] = RACE_CATEGORY_IDS.map(
  (id) => RACE_CATEGORIES[id]
);

export function isRaceCategoryId(value: unknown): value is RaceCategoryId {
  return typeof value === "string" && (RACE_CATEGORY_IDS as readonly string[]).includes(value);
}

/** "Indian Super Touring Cars — 3 Rounds · 10 Races" — used by the form's select options. */
export function categoryLabel(category: RaceCategoryMeta): string {
  return `${category.name} — ${category.rounds} Rounds · ${category.races} Races`;
}
