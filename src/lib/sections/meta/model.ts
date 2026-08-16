import { isRecord, link, text } from "@/lib/normalise";
import type { PageMeta, SectionModule } from "@/lib/sections/types";

/**
 * What the page is called, and the account it points at.
 *
 * Not a band on the page — this section renders nothing at all. It is the
 * identity the page title, the search-engine markup and the introduction's
 * follow button are all written from, which is why it is one stored value
 * rather than the same three words typed into three sections.
 *
 * Fixed: every page has exactly one, it cannot be added, removed or moved, and
 * it sits at the top of the console's list with the other fixed sections.
 */
export type Meta = PageMeta;

export const BLANK_META: Meta = {
  name: "",
  short: "",
  tagline: "",
  handle: "",
  instagram: "",
  followLabel: "",
};

export const meta: SectionModule<Meta> = {
  type: "meta",
  label: "Identity",
  hint: "What this page is called, and the account it points at — the title, the search-engine markup and the follow button.",
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
      handle: text(value.handle, d.handle),
      instagram: link(value.instagram, d.instagram),
      // Blank leaves the chip off the introduction entirely, as does a blank
      // address — the words on a button are the page's to choose, not this
      // file's, and a chip nobody typed is a chip that came from here rather
      // than from the championship.
      followLabel: text(value.followLabel, d.followLabel, 60),
    };
  },
};
