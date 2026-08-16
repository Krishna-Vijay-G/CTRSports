import { image, isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** The panel that covers the page while the first banner photograph loads. */
export type Splash = { title: string; logo: string };

export const BLANK_SPLASH: Splash = { title: "", logo: "" };

export const splash: SectionModule<Splash> = {
  type: "splash",
  label: "Splash screen",
  hint: "The panel that covers the page while the first banner photo loads.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "head",
  blank: () => ({ ...BLANK_SPLASH }),
  normalise: (raw) => {
    const d = BLANK_SPLASH;
    const value = isRecord(raw) ? raw : {};

    return { title: text(value.title, d.title), logo: image(value.logo, d.logo) };
  },
};
