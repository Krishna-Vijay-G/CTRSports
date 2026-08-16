import { isRecord, list, optionalText } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export type Stat = { value: string; label: string };
export type Stats = { items: Stat[] };

export const MAX_STATS = 6;

export const stats: SectionModule<Stats> = {
  type: "stats",
  label: "Numbers",
  hint: "A handful of figures, in a band across the page.",
  surface: ["home"],
  multiple: true,
  anchor: "stats",
  blank: () => ({ items: [] }),
  normalise: (raw) => ({
    items: list(
      isRecord(raw) ? raw.items : undefined,
      MAX_STATS,
      (entry) => ({ value: optionalText(entry.value, 12), label: optionalText(entry.label) }),
      []
    ),
  }),
};
