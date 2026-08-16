import { BODY_MAX, isRecord, link, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** The accent band between the last section and the footer. */
export type CtaBand = {
  label: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export const BLANK_CTA_BAND: CtaBand = {
  label: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};

export const ctaBand: SectionModule<CtaBand> = {
  type: "ctaBand",
  label: "Call to action",
  hint: "The accent band above the footer.",
  surface: ["home"],
  multiple: true,
  anchor: "cta",
  blank: () => ({ ...BLANK_CTA_BAND }),
  normalise: (raw) => {
    const d = BLANK_CTA_BAND;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      body: text(value.body, d.body, BODY_MAX),
      ctaLabel: text(value.ctaLabel, d.ctaLabel),
      ctaHref: link(value.ctaHref, d.ctaHref),
    };
  },
};
