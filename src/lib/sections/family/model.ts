import {
  BODY_MAX,
  bool,
  image,
  isRecord,
  link,
  list,
  oneOf,
  optionalText,
  text,
  withIds,
} from "@/lib/normalise";
import { LINK_ICONS, type LinkChip } from "@/lib/sections/shared/links";
import type { SectionModule } from "@/lib/sections/types";

/** A full-bleed photograph, a quote over it, and chips under it. */
export type Family = {
  image: string;
  lead: string;
  quote: string;
  showFlag: boolean;
  /** The chips under the quote. Empty leaves the quote on its own. */
  links: LinkChip[];
};

/** A row of chips under a quote. More than four wraps into a list. */
export const MAX_FAMILY_LINKS = 4;

export const BLANK_FAMILY: Family = {
  image: "",
  lead: "",
  quote: "",
  showFlag: true,
  links: [],
};

export const family: SectionModule<Family> = {
  type: "family",
  label: "Quote",
  hint: "A full-bleed photograph, the quote over it, and the chips under it.",
  surface: ["home"],
  multiple: true,
  anchor: "family",
  blank: () => ({ ...BLANK_FAMILY, links: [] }),
  normalise: (raw) => {
    const d = BLANK_FAMILY;
    const value = isRecord(raw) ? raw : {};

    return {
      image: image(value.image, d.image),
      lead: text(value.lead, d.lead),
      quote: text(value.quote, d.quote, BODY_MAX),
      showFlag: bool(value.showFlag, d.showFlag),
      links: withIds(
        list(
          value.links,
          MAX_FAMILY_LINKS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            icon: oneOf(entry.icon, LINK_ICONS, "globe"),
            label: optionalText(entry.label, 60),
            note: optionalText(entry.note, 40),
            href: link(entry.href, "#"),
          }),
          d.links
        ),
        "family-link"
      ),
    };
  },
};
