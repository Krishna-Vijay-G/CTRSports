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
  /**
   * The follow chip, beside the button.
   *
   * Fields of the IDENTITY section until 0019, on the argument that a handle
   * belongs to the page rather than to the band that prints it. It is drawn
   * here and nowhere else, and a page may not even have an introduction — so
   * on the landing page, which has an `about` band instead, they did nothing
   * whatever was typed into them.
   *
   * `followHref` rather than `instagram`, which is what it was called: it is an
   * address, and a championship whose following is on YouTube had a field name
   * telling it otherwise.
   *
   * Blank label or blank address leaves the chip off entirely. The words on a
   * button are the championship's to choose, and a chip nobody typed is one
   * that came from this file rather than from them.
   */
  followLabel: string;
  followHandle: string;
  followHref: string;
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
  followLabel: "",
  followHandle: "",
  followHref: "",
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
      followLabel: text(value.followLabel, d.followLabel, 60),
      followHandle: text(value.followHandle, d.followHandle, 60),
      followHref: link(value.followHref, d.followHref),
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
