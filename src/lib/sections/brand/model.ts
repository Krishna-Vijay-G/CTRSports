import { image, isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** The name and logo the header, the footer and the splash screen wear. */
export type Brand = { name: string; subtitle: string; logo: string };

export const BLANK_BRAND: Brand = { name: "", subtitle: "", logo: "" };

export const brand: SectionModule<Brand> = {
  type: "brand",
  label: "Brand",
  hint: "The name and logo used in the header, the footer and the splash screen.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "head",
  blank: () => ({ ...BLANK_BRAND }),
  normalise: (raw) => {
    const d = BLANK_BRAND;
    const value = isRecord(raw) ? raw : {};

    return {
      name: text(value.name, d.name),
      subtitle: text(value.subtitle, d.subtitle),
      logo: image(value.logo, d.logo),
    };
  },
};
