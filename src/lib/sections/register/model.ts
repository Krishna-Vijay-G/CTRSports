import { BODY_MAX, isRecord, link, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/** The accent band at the foot, and the one thing the page asks for. */
export type Register = {
  kicker: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export const BLANK_REGISTER: Register = {
  kicker: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};

export const register: SectionModule<Register> = {
  type: "register",
  label: "Registration band",
  hint: "The accent band at the foot, and the one thing the page asks for.",
  surface: ["home"],
  multiple: true,
  anchor: "register",
  blank: () => ({ ...BLANK_REGISTER }),
  normalise: (raw) => {
    const d = BLANK_REGISTER;
    const value = isRecord(raw) ? raw : {};

    return {
      kicker: text(value.kicker, d.kicker),
      title: text(value.title, d.title),
      body: text(value.body, d.body, BODY_MAX),
      ctaLabel: text(value.ctaLabel, d.ctaLabel),
      ctaHref: link(value.ctaHref, d.ctaHref),
    };
  },
};
