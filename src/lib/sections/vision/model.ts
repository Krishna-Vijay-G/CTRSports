import { BODY_MAX, isRecord, list, oneOf, optionalText, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export const VISION_ICONS = ["star", "rocket", "shield", "globe", "flag", "spark"] as const;
export type VisionIcon = (typeof VISION_ICONS)[number];

export type VisionItem = { icon: VisionIcon; label: string; description: string };
export type Vision = { label: string; title: string; items: VisionItem[] };

export const MAX_VISION = 6;

export const BLANK_VISION: Vision = { label: "", title: "", items: [] };

export const vision: SectionModule<Vision> = {
  type: "vision",
  label: "Cards",
  hint: "A heading over a row of cards, each with an icon.",
  surface: ["home"],
  multiple: true,
  anchor: "vision",
  blank: () => ({ ...BLANK_VISION, items: [] }),
  normalise: (raw) => {
    const d = BLANK_VISION;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      items: list(
        value.items,
        MAX_VISION,
        (entry) => ({
          icon: oneOf(entry.icon, VISION_ICONS, "star"),
          label: optionalText(entry.label),
          description: optionalText(entry.description, BODY_MAX),
        }),
        d.items
      ),
    };
  },
};
