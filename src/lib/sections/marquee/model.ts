import { isRecord, lines } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** The line of announcements sliding under the banners. */
export type Marquee = { items: string[] };

export const MAX_MARQUEE_ITEMS = 50;

export const marquee: SectionModule<Marquee> = {
  type: "marquee",
  label: "Ticker",
  hint: "A line of short announcements, sliding.",
  surface: ["home"],
  multiple: true,
  blank: () => ({ items: [] }),
  normalise: (raw) => ({
    items: lines(isRecord(raw) ? raw.items : undefined, MAX_MARQUEE_ITEMS, []),
  }),
};
