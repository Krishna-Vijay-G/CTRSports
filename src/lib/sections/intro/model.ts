import { PLACEHOLDER_PHOTO } from "@/config/images";
import { BODY_MAX, image, isRecord, link, list, optionalText, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * One mark in the panel beside the introduction.
 *
 * `href` is optional and usually blank. A mark with one becomes a link to
 * wherever that partner should be sent — their own site, a page here, a section
 * of this one; a mark without one is a picture, which is what a sanctioning
 * body's crest normally wants to be. `name` is the alt text either way, so the
 * mark says who it is whether or not it goes anywhere.
 */
export type Partner = { name: string; logo: string; href: string };

export type Intro = {
  kicker: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  partnersLabel: string;
  partners: Partner[];
};

export const MAX_PARTNERS = 6;

export const BLANK_INTRO: Intro = {
  kicker: "",
  headline: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  partnersLabel: "",
  partners: [],
};

export const intro: SectionModule<Intro> = {
  type: "intro",
  label: "Introduction",
  hint: "What this is, and the marks beside it.",
  surface: ["home"],
  multiple: true,
  anchor: "intro",
  promoted: "partners",
  blank: () => ({ ...BLANK_INTRO, partners: [] }),
  normalise: (raw) => {
    const d = BLANK_INTRO;
    const value = isRecord(raw) ? raw : {};

    return {
      kicker: text(value.kicker, d.kicker),
      headline: text(value.headline, d.headline),
      body: text(value.body, d.body, BODY_MAX),
      ctaLabel: text(value.ctaLabel, d.ctaLabel),
      ctaHref: link(value.ctaHref, d.ctaHref),
      partnersLabel: text(value.partnersLabel, d.partnersLabel),
      partners: list(
        value.partners,
        MAX_PARTNERS,
        (entry) => ({
          name: optionalText(entry.name),
          logo: image(entry.logo, PLACEHOLDER_PHOTO),
          // "" rather than a fallback address: a mark saved before marks could
          // be linked has no href, and the honest reading of that is a picture
          // that goes nowhere — not one silently pointed at somebody else's
          // link. `link` also refuses anything that is not http(s), a path or an
          // anchor, which is what keeps a `javascript:` payload out of the
          // <a href> this ends up in.
          href: link(entry.href, ""),
        }),
        d.partners
      ),
    };
  },
};
