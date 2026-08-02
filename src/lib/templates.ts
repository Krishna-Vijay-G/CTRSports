/**
 * The five banner layouts a post can be shown with.
 *
 * `id` is what lands in the database, so these strings must stay stable.
 * Templates apply to the banners at the top of the landing page only — every
 * card in the grid at the bottom uses one shared format.
 */
export const TEMPLATE_IDS = ["wedge", "cinematic", "split", "spotlight", "marquee"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE: TemplateId = "wedge";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
};

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  wedge: {
    id: "wedge",
    name: "Wedge",
    description: "Diagonal cut, media filling the right. The house style.",
  },
  cinematic: {
    id: "cinematic",
    name: "Cinematic",
    description: "Edge-to-edge media, copy low-left over a deep scrim.",
  },
  split: {
    id: "split",
    name: "Split",
    description: "Clean 50/50 — solid panel left, media right. No diagonal.",
  },
  spotlight: {
    id: "spotlight",
    name: "Spotlight",
    description: "Framed media with a gold glow. Nothing gets cropped.",
  },
  marquee: {
    id: "marquee",
    name: "Marquee",
    description: "Dimmed full-bleed media, oversized centred headline.",
  },
};

export const TEMPLATE_LIST: TemplateMeta[] = TEMPLATE_IDS.map((id) => TEMPLATES[id]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}

export function resolveTemplate(value: unknown): TemplateMeta {
  return TEMPLATES[isTemplateId(value) ? value : DEFAULT_TEMPLATE];
}
