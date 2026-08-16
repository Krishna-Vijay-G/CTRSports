import { BODY_MAX, bool, isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The heading over the entry forms.
 *
 * WHICH forms appear is not stored: the section shows every published form
 * belonging to this site, in the order the Registrations screen puts them in.
 * Every published form for a site belongs on its page, so there is no editorial
 * choice to record — unlike the deck cards below, which are picked.
 */
export type Registrations = { label: string; title: string; body: string; showClosed: boolean };

export const BLANK_REGISTRATIONS: Registrations = {
  label: "",
  title: "",
  body: "",
  showClosed: true,
};

export const registrations: SectionModule<Registrations> = {
  type: "registrations",
  label: "Entry forms",
  hint: "Cards linking to this site's entry forms. Which forms appear is not chosen here.",
  surface: ["home"],
  multiple: false,
  anchor: "registrations",
  needs: ["forms"],
  blank: () => ({ ...BLANK_REGISTRATIONS }),
  normalise: (raw) => {
    const d = BLANK_REGISTRATIONS;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      body: text(value.body, d.body, BODY_MAX),
      showClosed: bool(value.showClosed, d.showClosed),
    };
  },
};
