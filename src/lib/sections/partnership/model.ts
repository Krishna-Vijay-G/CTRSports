import {
  COLLAGE_LAYOUT_IDS,
  MAX_COLLAGE_CELLS,
  defaultLayoutFor,
  type CollageLayoutId,
} from "@/lib/collage";
import { BODY_MAX, image, isRecord, list, oneOf, optionalText, text } from "@/lib/normalise";
import { PLACEHOLDER_PHOTO } from "@/config/images";
import type { SectionModule } from "@/lib/sections/types";

export type Shot = { image: string; alt: string };

export type Partnership = {
  label: string;
  title: string;
  body: string;
  /** Which arrangement the photographs are laid out in. See src/lib/collage.ts. */
  layout: CollageLayoutId;
  /** Cell order: the first is the first cell of the layout. */
  shots: Shot[];
};

/** The most cells any collage arrangement has — see src/lib/collage.ts. */
export const MAX_SHOTS = MAX_COLLAGE_CELLS;

export const BLANK_PARTNERSHIP: Partnership = {
  label: "",
  title: "",
  body: "",
  // A real id rather than "": the field is typed to the set, and the normaliser
  // picks its own from the photograph count regardless.
  layout: "one",
  shots: [],
};

export const partnership: SectionModule<Partnership> = {
  type: "partnership",
  label: "Collage",
  hint: "Copy beside an arrangement of photographs.",
  surface: ["home"],
  multiple: true,
  anchor: "partnership",
  blank: () => ({ ...BLANK_PARTNERSHIP, shots: [] }),
  normalise: (raw) => {
    const d = BLANK_PARTNERSHIP;
    const value = isRecord(raw) ? raw : {};

    const shots = list(
      value.shots,
      MAX_SHOTS,
      (entry) => ({
        image: image(entry.image, PLACEHOLDER_PHOTO),
        alt: optionalText(entry.alt),
      }),
      d.shots
    );

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      body: text(value.body, d.body, BODY_MAX),
      // Kept as stored even when it no longer fits the number of photographs:
      // `resolveCollage` draws the right one for the count either way, and
      // leaving the id alone is what lets a photograph be removed and put back
      // without quietly losing the choice. An id from a retired arrangement
      // falls back to the default for however many there are.
      layout: oneOf(value.layout, COLLAGE_LAYOUT_IDS, defaultLayoutFor(shots.length)),
      shots,
    };
  },
};
