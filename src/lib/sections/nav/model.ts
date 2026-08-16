import { isRecord, link, list, optionalText, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export type NavLink = { label: string; href: string };
export type Nav = { links: NavLink[]; cta: NavLink };

export const MAX_NAV_LINKS = 8;

export const BLANK_NAV: Nav = { links: [], cta: { label: "", href: "" } };

export const nav: SectionModule<Nav> = {
  type: "nav",
  label: "Navigation",
  hint: "The links across the top of the banners, and the button beside them.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "head",
  blank: () => ({ links: [], cta: { label: "", href: "" } }),
  normalise: (raw) => {
    const d = BLANK_NAV;
    const value = isRecord(raw) ? raw : {};
    const cta = isRecord(value.cta) ? value.cta : {};

    return {
      links: list(
        value.links,
        MAX_NAV_LINKS,
        (entry) => ({ label: optionalText(entry.label), href: link(entry.href, "#top") }),
        d.links
        // A link with no words is invisible and unclickable — drop it rather
        // than render a gap in the nav.
      ).filter((entry) => entry.label !== ""),
      cta: { label: text(cta.label, d.cta.label), href: link(cta.href, d.cta.href) },
    };
  },
};
