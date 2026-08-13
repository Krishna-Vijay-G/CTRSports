/**
 * The arrangements a photo collage can take.
 *
 * One catalogue, shared by the page that draws the collage and the admin that
 * picks it, so the little diagram in the editor is built from the same data as
 * the thing on the site and the two cannot disagree about what "Hero left"
 * means.
 *
 * An arrangement is written as CSS grid AREAS — one string per row, one letter
 * per column, the letters in reading order:
 *
 *   ["a a b",     a is the big one, two columns wide and two rows tall;
 *    "a a c"]     b and c stack down the right.
 *
 * Which is also the answer to "which photograph goes in which cell": the first
 * photograph is `a`, the second `b`, and so on down the list. Reordering the
 * list is what moves a photograph from one cell to another — there is no cell
 * number stored on a photograph, because a number typed on each of six of them
 * can be duplicated, skipped or left pointing at a cell the layout does not
 * have, and none of those can happen to a position in a list.
 *
 * Every layout holds an exact number of photographs, and `resolveCollage` is
 * what guarantees the one drawn matches how many there actually are: a document
 * asking for a five-photograph layout with three photographs in it gets the
 * default three, rather than a grid with two holes in it.
 *
 * A named area must be a RECTANGLE — CSS drops the whole template otherwise —
 * so an arrangement added below needs its letters checked for that.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

export type CollageLayout = {
  id: string;
  /** How many photographs it holds. Every cell is filled or the layout is not used. */
  cells: number;
  /** What the picker calls it. */
  label: string;
  /** One string per row; one cell letter per column. */
  areas: readonly string[];
  /** The shape the whole collage takes once the arrangement applies. */
  ratio: string;
};

export const COLLAGE_LAYOUTS = [
  /* ── One ── */
  { id: "one", cells: 1, label: "Full width", areas: ["a"], ratio: "16 / 9" },

  /* ── Two ── */
  { id: "two-side", cells: 2, label: "Side by side", areas: ["a b"], ratio: "2 / 1" },
  { id: "two-hero", cells: 2, label: "Wide and narrow", areas: ["a a b"], ratio: "9 / 4" },
  { id: "two-stack", cells: 2, label: "Stacked", areas: ["a", "b"], ratio: "1 / 1" },

  /* ── Three ── */
  {
    id: "three-hero-left",
    cells: 3,
    label: "Hero left",
    areas: ["a a b", "a a c"],
    ratio: "16 / 9",
  },
  {
    id: "three-hero-right",
    cells: 3,
    label: "Hero right",
    areas: ["a b b", "c b b"],
    ratio: "16 / 9",
  },
  { id: "three-row", cells: 3, label: "Row of three", areas: ["a b c"], ratio: "3 / 1" },
  { id: "three-hero-top", cells: 3, label: "Hero on top", areas: ["a a", "b c"], ratio: "1 / 1" },

  /* ── Four ── */
  {
    id: "four-hero-left",
    cells: 4,
    label: "Hero left",
    areas: ["a a b", "a a c", "a a d"],
    ratio: "16 / 9",
  },
  { id: "four-grid", cells: 4, label: "Two by two", areas: ["a b", "c d"], ratio: "1 / 1" },
  {
    id: "four-mosaic",
    cells: 4,
    label: "Mosaic",
    areas: ["a a b c", "a a d d"],
    ratio: "2 / 1",
  },
  { id: "four-row", cells: 4, label: "Row of four", areas: ["a b c d"], ratio: "4 / 1" },

  /* ── Five ── */
  {
    id: "five-hero-left",
    cells: 5,
    label: "Hero left",
    areas: ["a a b c", "a a d e"],
    ratio: "2 / 1",
  },
  { id: "five-mosaic", cells: 5, label: "Mosaic", areas: ["a a b", "c d e"], ratio: "16 / 9" },

  /* ── Six ── */
  { id: "six-grid", cells: 6, label: "Three by two", areas: ["a b c", "d e f"], ratio: "3 / 2" },
  {
    id: "six-hero-left",
    cells: 6,
    label: "Hero left",
    areas: ["a a b", "a a c", "d e f"],
    ratio: "1 / 1",
  },
  {
    id: "six-mosaic",
    cells: 6,
    label: "Mosaic",
    areas: ["a a b b", "a a c d", "e e f f"],
    ratio: "4 / 3",
  },
] as const satisfies readonly CollageLayout[];

export type CollageLayoutId = (typeof COLLAGE_LAYOUTS)[number]["id"];

/** For `oneOf`, so a retired arrangement reads back as the default with no migration. */
export const COLLAGE_LAYOUT_IDS = COLLAGE_LAYOUTS.map((layout) => layout.id);

/** The most cells any arrangement has, and so the most photographs a collage holds. */
export const MAX_COLLAGE_CELLS = 6;

/** Cell letters, in reading order: photograph 1 is `a`. */
const LETTERS = ["a", "b", "c", "d", "e", "f"] as const;

export function cellName(index: number): string {
  return LETTERS[index] ?? "a";
}

/** Every arrangement that holds exactly this many photographs. */
export function layoutsFor(count: number): readonly CollageLayout[] {
  return COLLAGE_LAYOUTS.filter((layout) => layout.cells === count);
}

/** What this many photographs get when nothing has been chosen. The first listed. */
export function defaultLayoutFor(count: number): CollageLayoutId {
  return (layoutsFor(count)[0]?.id ?? "one") as CollageLayoutId;
}

/**
 * The arrangement to actually draw, or null when there is nothing to draw.
 *
 * The stored choice only holds while it fits: add a fourth photograph to a
 * three-photograph layout and this hands back the default four, so the page is
 * never a grid with a hole in it. The stored id is left alone, which is what
 * lets a photograph be removed and put back without losing the choice.
 */
export function resolveCollage(id: string, count: number): CollageLayout | null {
  if (count <= 0) return null;

  const wanted = COLLAGE_LAYOUTS.find((layout) => layout.id === id);
  if (wanted && wanted.cells === count) return wanted;

  return COLLAGE_LAYOUTS.find((layout) => layout.id === defaultLayoutFor(count)) ?? null;
}

/** The stored choice if it still fits this many photographs, or the new default. */
export function keepOrDefault(id: string, count: number): CollageLayoutId {
  const layout = COLLAGE_LAYOUTS.find((entry) => entry.id === id);
  return layout && layout.cells === count ? layout.id : defaultLayoutFor(count);
}

export function columnsOf(layout: CollageLayout): number {
  return layout.areas[0]?.trim().split(/\s+/).length ?? 1;
}

/**
 * The arrangement as the four custom properties `.collage` reads.
 *
 * Custom properties rather than utility classes because grid-template-areas
 * cannot be written as one, and a Tailwind class assembled from a variable is
 * not in the stylesheet at all. The media query that decides WHEN the
 * arrangement applies stays in the stylesheet, where it can be one.
 */
export function collageVars(layout: CollageLayout): Record<string, string> {
  return {
    "--collage-areas": layout.areas.map((row) => `"${row}"`).join(" "),
    "--collage-cols": `repeat(${columnsOf(layout)}, minmax(0, 1fr))`,
    "--collage-rows": `repeat(${layout.areas.length}, minmax(0, 1fr))`,
    "--collage-ratio": layout.ratio,
  };
}

/**
 * The same arrangement as a plain grid, applied at every width.
 *
 * For the diagram in the admin, which is a picture of the layout rather than
 * the layout itself — it must keep its shape in a narrow column, where the
 * collage on the page has long since stacked.
 */
export function collageGrid(layout: CollageLayout): Record<string, string> {
  return {
    display: "grid",
    gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(" "),
    gridTemplateColumns: `repeat(${columnsOf(layout)}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layout.areas.length}, minmax(0, 1fr))`,
    aspectRatio: layout.ratio,
  };
}
