/**
 * The five presentation templates a post can be shown with.
 *
 * `id` is what lands in the database, so these strings must stay stable.
 * Shared by the public banner, the grid card and the admin picker.
 */
export const TEMPLATE_IDS = ["wedge", "cinematic", "split", "spotlight", "marquee"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE: TemplateId = "wedge";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  /** How the same post is treated in the bottom grid, so the choice shows there too. */
  card: {
    /** Tailwind aspect-ratio class for the card's media stage. */
    aspect: string;
    /** `cover` crops to fill; `contain` keeps the whole frame visible. */
    fit: "cover" | "contain";
    /** Copy sits under the media, or over it with a scrim. */
    overlay: boolean;
  };
};

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  wedge: {
    id: "wedge",
    name: "Wedge",
    description: "Diagonal cut, media filling the right. The house style.",
    card: { aspect: "aspect-[4/3]", fit: "cover", overlay: false },
  },
  cinematic: {
    id: "cinematic",
    name: "Cinematic",
    description: "Edge-to-edge media, copy low-left over a deep scrim.",
    card: { aspect: "aspect-video", fit: "cover", overlay: true },
  },
  split: {
    id: "split",
    name: "Split",
    description: "Clean 50/50 — solid panel left, media right. No diagonal.",
    card: { aspect: "aspect-[4/3]", fit: "cover", overlay: false },
  },
  spotlight: {
    id: "spotlight",
    name: "Spotlight",
    description: "Portrait frame with a gold glow. Nothing gets cropped.",
    card: { aspect: "aspect-[4/5]", fit: "contain", overlay: false },
  },
  marquee: {
    id: "marquee",
    name: "Marquee",
    description: "Dimmed full-bleed media, oversized centred headline.",
    card: { aspect: "aspect-square", fit: "cover", overlay: true },
  },
};

export const TEMPLATE_LIST: TemplateMeta[] = TEMPLATE_IDS.map((id) => TEMPLATES[id]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}

export function resolveTemplate(value: unknown): TemplateMeta {
  return TEMPLATES[isTemplateId(value) ? value : DEFAULT_TEMPLATE];
}
