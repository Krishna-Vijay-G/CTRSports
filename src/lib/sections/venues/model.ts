import { isRecord, link, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The heading over the first three circuits.
 *
 * The circuits themselves are rows of `ctr.tracks` — the section shows the first
 * three and sends the reader to the index for the rest — so there is nothing
 * about a venue to type in here.
 *
 * `cardLabel` is the word before each card's number ("Circuit 01"); the number
 * is the card's position and is not stored. `cardCta` is the line at the foot of
 * a card. Both blank simply leave that piece off.
 */
export type Venues = {
  label: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  cardLabel: string;
  cardCta: string;
};

export const BLANK_VENUES: Venues = {
  label: "",
  title: "",
  ctaLabel: "",
  ctaHref: "",
  cardLabel: "",
  cardCta: "",
};

export const venues: SectionModule<Venues> = {
  type: "venues",
  label: "Venues",
  hint: "A heading over the first three circuits. The circuits themselves live on the Circuits screen.",
  surface: ["home"],
  multiple: true,
  anchor: "venues",
  needs: ["circuits"],
  blank: () => ({ ...BLANK_VENUES }),
  normalise: (raw) => {
    const d = BLANK_VENUES;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      ctaLabel: text(value.ctaLabel, d.ctaLabel, 60),
      ctaHref: link(value.ctaHref, d.ctaHref),
      cardLabel: text(value.cardLabel, d.cardLabel, 40),
      cardCta: text(value.cardCta, d.cardCta, 40),
    };
  },
};
