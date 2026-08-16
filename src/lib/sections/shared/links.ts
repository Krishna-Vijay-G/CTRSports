/**
 * The glyphs a link chip can wear.
 *
 * Six marks and four plain ones, because a chip is recognised by its logo
 * before it is read: an Instagram chip is spotted, a chip saying "Instagram" is
 * read. The plain four are for everything that is not a network — a site, an
 * address, a number, or anywhere else worth sending someone.
 *
 * Drawn in LINK_GLYPHS, in shared/icons.tsx. Retiring one is safe: a stored chip
 * asking for it reads back as `globe`.
 *
 * Shared rather than owned by the family band, because the follow button draws
 * one too and a second list would be a second answer to the same question.
 */
export const LINK_ICONS = [
  "instagram",
  "facebook",
  "youtube",
  "x",
  "linkedin",
  "whatsapp",
  "globe",
  "mail",
  "phone",
  "arrow",
] as const;
export type LinkIcon = (typeof LINK_ICONS)[number];

/**
 * One chip: a glyph, what it says, and where it goes.
 *
 * `note` is the tail printed in the accent after the label — a handle, a number,
 * a city. Blank prints nothing, which is what most chips want.
 */
export type LinkChip = {
  id: string;
  icon: LinkIcon;
  label: string;
  note: string;
  href: string;
};
