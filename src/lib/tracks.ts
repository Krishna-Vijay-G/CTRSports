/**
 * The circuit outlines.
 *
 * Each venue card draws the shape of the track it races on. These are stylised
 * — recognisable as that circuit's layout, not a survey — because they are
 * rendered about 200px wide and every kerb detail would be mud at that size.
 *
 * Path data rather than a component so the admin can list the tracks in a
 * dropdown without importing anything that renders. `TrackMap` draws them.
 *
 * Adding a circuit is: draw a closed path on the 0 0 400 260 grid, add it here,
 * and it appears in the admin's picker on its own. Removing one is safe — a
 * venue still holding the old id falls back to `circuit`, the generic outline.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

export const TRACK_IDS = ["kari", "bren", "mic", "circuit", "none"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export type Track = {
  name: string;
  /** A closed path on a 0 0 400 260 grid. Empty means "draw nothing". */
  path: string;
  /** The start-finish line, drawn across the track. Omitted with the path. */
  start?: { x1: number; y1: number; x2: number; y2: number };
  /** Shown under the picker in the admin. */
  hint: string;
};

export const TRACKS: Record<TrackId, Track> = {
  kari: {
    name: "Kari Motor Speedway",
    hint: "Tight and technical — Coimbatore.",
    path:
      "M72 196C44 188 36 152 58 132c20-18 58-12 80-26 22-14 14-44 38-54 30-12 60 6 68 32 " +
      "8 26-8 46 6 64 18 22 66 12 86 32 20 20 8 46-20 48-48 4-106-18-156-18-32 0-64-8-88-14Z",
    start: { x1: 150, y1: 210, x2: 150, y2: 188 },
  },
  bren: {
    name: "Bren Raceway",
    hint: "Fast, flowing and new — Bengaluru.",
    path:
      "M64 132c0-36 32-60 68-56 40 4 58 42 92 52 34 10 68-10 96 4 30 16 32 60 2 76 " +
      "-30 16-68 0-106-4-38-4-76 10-110 0-32-10-42-36-42-72Z",
    start: { x1: 112, y1: 78, x2: 108, y2: 100 },
  },
  mic: {
    name: "Madras International Circuit",
    hint: "Long back straight into a hairpin — Chennai.",
    path:
      "M60 208h240c32 0 48-20 44-44-4-24-28-36-52-30-30 8-42 38-72 42-30 4-44-24-70-34 " +
      "-26-10-54-2-66-24-12-22 4-50 30-52 26-2 42 18 38 40-4 24-32 34-52 50-22 18-40 28-40 52Z",
    start: { x1: 190, y1: 196, x2: 190, y2: 220 },
  },
  circuit: {
    name: "Generic circuit",
    hint: "For a venue whose layout is not drawn yet.",
    path:
      "M76 160c0-48 40-84 88-84s72 36 112 42c40 6 68-12 80 16 12 28-12 62-52 62 " +
      "-40 0-72-18-112-14-40 4-72 26-96 12-18-10-20-18-20-34Z",
    start: { x1: 164, y1: 64, x2: 164, y2: 88 },
  },
  none: {
    name: "No outline",
    hint: "Just the name and the city.",
    path: "",
  },
};

export function isTrackId(value: unknown): value is TrackId {
  return (TRACK_IDS as readonly string[]).includes(value as string);
}
