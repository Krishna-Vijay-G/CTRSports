import { BODY_MAX, isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The footer's own copy.
 *
 * One line under the brand saying what this organisation is, for the reader who
 * arrived on a deck or an entry form and has never seen the home page. Its own
 * section rather than part of the brand, because it appears in exactly one place
 * — the header and the splash screen have no room for a sentence.
 */
export type Footer = { blurb: string };

export const BLANK_FOOTER: Footer = { blurb: "" };

export const footer: SectionModule<Footer> = {
  type: "footer",
  label: "Footer",
  hint: "The line under the brand at the foot of every page.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "foot",
  blank: () => ({ ...BLANK_FOOTER }),
  normalise: (raw) => {
    const d = BLANK_FOOTER;
    const value = isRecord(raw) ? raw : {};

    return { blurb: text(value.blurb, d.blurb, BODY_MAX) };
  },
};
