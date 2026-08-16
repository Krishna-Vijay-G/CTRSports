import { normaliseBanners, type Banner } from "@/lib/banners";
import { isRecord } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The rotating panels at the top, with the header laid over them.
 *
 * The only section whose value IS its promoted list: there is nothing to type
 * about the carousel itself, so the banners are rows of `ctr.banners` keyed to
 * this section and `data` carries nothing else. Emptying the list leaves the
 * section in place drawing nothing, and the header falls back to a solid bar —
 * which is what stops a page coming up with no way to navigate away from it.
 *
 * `carriesHeader` is why this is normally first. It is not forced to be: put a
 * ticker above it and the header simply draws as a bar, which is a legitimate
 * page and not a mistake anybody needs protecting from.
 */
export type Banners = { items: Banner[] };

export const banners: SectionModule<Banners> = {
  type: "banners",
  label: "Banners",
  hint: "The rotating panels at the top — photo, copy, link, layout.",
  surface: ["home"],
  multiple: false,
  carriesHeader: true,
  promoted: "banners",
  blank: () => ({ items: [] }),
  normalise: (raw) => ({
    items: normaliseBanners(isRecord(raw) ? raw.items : undefined, []),
  }),
};
