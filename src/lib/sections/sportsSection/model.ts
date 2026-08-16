import { isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The heading over the sports cards.
 *
 * The cards themselves are rows of `ctr.sports` — a card is a picture, a line of
 * copy and somewhere to go, and it has a Save of its own — so nothing about a
 * sport is stored here. That is the same arrangement the venues and the entry
 * forms have: the section owns the words around the records, not the records.
 */
export type SportsHeading = { label: string; title: string };

export const BLANK_SPORTS_SECTION: SportsHeading = { label: "", title: "" };

export const sportsSection: SectionModule<SportsHeading> = {
  type: "sportsSection",
  label: "Sports",
  hint: "The heading above the sports cards, and the cards themselves.",
  surface: ["home"],
  multiple: false,
  anchor: "sports",
  blank: () => ({ ...BLANK_SPORTS_SECTION }),
  normalise: (raw) => {
    const d = BLANK_SPORTS_SECTION;
    const value = isRecord(raw) ? raw : {};

    return { label: text(value.label, d.label), title: text(value.title, d.title) };
  },
};
