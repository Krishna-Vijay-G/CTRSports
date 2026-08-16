import { isRecord, link, list, oneOf, optionalText } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export const SOCIAL_ICONS = ["instagram", "facebook", "twitter", "youtube", "website"] as const;
export type SocialIconName = (typeof SOCIAL_ICONS)[number];

export type SocialLink = { label: string; href: string; icon: SocialIconName };

/**
 * The row of accounts in the footer.
 *
 * The stored value is the ARRAY itself rather than an object wrapping one. That
 * is how 0006 wrote it and there is no reason to churn every stored document to
 * put a key in front of it — a section's data is whatever JSON its module can
 * read, and nothing else looks inside.
 */
export type Socials = SocialLink[];

export const MAX_SOCIALS = 8;

export const socials: SectionModule<Socials> = {
  type: "socials",
  label: "Social links",
  hint: "The accounts listed in the footer.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "foot",
  blank: () => [],
  normalise: (raw) => {
    // The stored shape is bare array; an object is a document written by
    // something that did not know that, and it has no links in it.
    const value = Array.isArray(raw) ? raw : isRecord(raw) ? raw.items : undefined;

    return list(
      value,
      MAX_SOCIALS,
      (entry) => ({
        label: optionalText(entry.label),
        href: link(entry.href, "#"),
        icon: oneOf(entry.icon, SOCIAL_ICONS, "website"),
      }),
      []
    ).filter((entry) => entry.label !== "");
  },
};
