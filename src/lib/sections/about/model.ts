import { BODY_MAX, image, isRecord, link, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export type LabelledPhoto = { src: string; label: string };

export type About = {
  label: string;
  title: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  photos: LabelledPhoto[];
};

/** The layout puts these either side of the copy; a third has nowhere to go. */
export const ABOUT_PHOTO_COUNT = 2;

export const BLANK_ABOUT: About = {
  label: "",
  title: "",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  // Two entries, not none. The view maps over THIS array to decide how many
  // slots the layout has, so an empty one would render no photographs at all
  // however many are stored.
  photos: [
    { src: "", label: "" },
    { src: "", label: "" },
  ],
};

/** Always exactly ABOUT_PHOTO_COUNT, because the layout has exactly that many slots. */
function photos(value: unknown, fallback: LabelledPhoto[]): LabelledPhoto[] {
  const source = Array.isArray(value) ? value : [];
  return fallback.map((defaults, index) => {
    const entry = source[index];
    if (!isRecord(entry)) return { ...defaults };
    return { src: image(entry.src, defaults.src), label: text(entry.label, defaults.label) };
  });
}

export const about: SectionModule<About> = {
  type: "about",
  label: "About",
  hint: "Copy with two labelled photographs beside it.",
  surface: ["home"],
  multiple: true,
  anchor: "about",
  blank: () => ({ ...BLANK_ABOUT, photos: BLANK_ABOUT.photos.map((photo) => ({ ...photo })) }),
  normalise: (raw) => {
    const d = BLANK_ABOUT;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      heading: text(value.heading, d.heading),
      body: text(value.body, d.body, BODY_MAX),
      ctaLabel: text(value.ctaLabel, d.ctaLabel),
      ctaHref: link(value.ctaHref, d.ctaHref),
      photos: photos(value.photos, d.photos),
    };
  },
};
