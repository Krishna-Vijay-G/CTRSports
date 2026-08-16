import { BODY_MAX, image, isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** A photograph with copy beside it, and a smaller one inset over its corner. */
export type Grid = {
  label: string;
  heading: string;
  body: string;
  image: string;
  imageAlt: string;
  caption: string;
  inset: string;
  insetAlt: string;
};

export const BLANK_GRID: Grid = {
  label: "",
  heading: "",
  body: "",
  image: "",
  imageAlt: "",
  caption: "",
  inset: "",
  insetAlt: "",
};

export const grid: SectionModule<Grid> = {
  type: "grid",
  label: "Feature",
  hint: "A photograph with copy beside it, and a smaller one inset over its corner.",
  surface: ["home"],
  multiple: true,
  anchor: "grid",
  blank: () => ({ ...BLANK_GRID }),
  normalise: (raw) => {
    const d = BLANK_GRID;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      heading: text(value.heading, d.heading),
      body: text(value.body, d.body, BODY_MAX),
      image: image(value.image, d.image),
      imageAlt: text(value.imageAlt, d.imageAlt),
      caption: text(value.caption, d.caption),
      inset: image(value.inset, d.inset),
      insetAlt: text(value.insetAlt, d.insetAlt),
    };
  },
};
