import { isRecord, text } from "@/lib/normalise";
import type { PageMeta, SectionModule } from "@/lib/sections/types";

/**
 * What the page is called, and the account it points at.
 *
 * Not a band on the page — this section renders nothing at all. It is the
 * identity the page title, the search-engine markup and the structured data are
 * written from, which is why it is one stored value rather than the same three
 * words typed into three sections.
 *
 * The follow chip used to live here and moved to the introduction in 0019. It
 * was the one thing on this section that was DRAWN, and it was drawn by a band
 * that a page might not have — so on the landing page, which has an `about`
 * rather than an `intro`, those fields did nothing whatever was typed into
 * them.
 *
 * Fixed: every page has exactly one, it cannot be added, removed or moved, and
 * it sits at the top of the console's list with the other fixed sections.
 */
export type Meta = PageMeta;

export const BLANK_META: Meta = {
  name: "",
  short: "",
  tagline: "",
};

export const meta: SectionModule<Meta> = {
  type: "meta",
  label: "Identity",
  hint: "What this page is called — the browser tab, the search result and the structured data.",
  surface: ["home"],
  multiple: false,
  fixed: true,
  blank: () => ({ ...BLANK_META }),
  normalise: (raw) => {
    const d = BLANK_META;
    const value = isRecord(raw) ? raw : {};

    return {
      name: text(value.name, d.name),
      short: text(value.short, d.short),
      tagline: text(value.tagline, d.tagline),
    };
  },
};
