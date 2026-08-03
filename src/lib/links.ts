/**
 * Where a post's call-to-action points, and what the button says.
 *
 * `id` is what lands in the database, so these strings must stay stable. The
 * label is derived from the type unless the post carries its own `link_label`,
 * which is how the `custom` type gets a name.
 */
export const LINK_TYPE_IDS = ["instagram", "facebook", "website", "custom"] as const;

export type LinkTypeId = (typeof LINK_TYPE_IDS)[number];

export const DEFAULT_LINK_TYPE: LinkTypeId = "instagram";

export type LinkTypeMeta = {
  id: LinkTypeId;
  /** Name shown in the admin dropdown. */
  name: string;
  /** Button text when the post has no label of its own. */
  defaultLabel: string;
  placeholder: string;
};

export const LINK_TYPES: Record<LinkTypeId, LinkTypeMeta> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    defaultLabel: "View on Instagram",
    placeholder: "https://www.instagram.com/p/…",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    defaultLabel: "View on Facebook",
    placeholder: "https://www.facebook.com/…",
  },
  website: {
    id: "website",
    name: "Website",
    defaultLabel: "Visit website",
    placeholder: "https://…",
  },
  custom: {
    id: "custom",
    name: "Custom name",
    defaultLabel: "Open link",
    placeholder: "https://…",
  },
};

export const LINK_TYPE_LIST: LinkTypeMeta[] = LINK_TYPE_IDS.map((id) => LINK_TYPES[id]);

export const LINK_LABEL_MAX = 40;

export function isLinkTypeId(value: unknown): value is LinkTypeId {
  return typeof value === "string" && (LINK_TYPE_IDS as readonly string[]).includes(value);
}

export function resolveLinkType(value: unknown): LinkTypeMeta {
  return LINK_TYPES[isLinkTypeId(value) ? value : DEFAULT_LINK_TYPE];
}

export type PostLink = {
  url: string;
  label: string;
  type: LinkTypeId;
};

/** Null when the post has no link — every caller treats the CTA as optional. */
export function resolvePostLink(post: {
  link_url: string | null;
  link_type: LinkTypeId | string | null;
  link_label: string | null;
}): PostLink | null {
  if (!post.link_url) return null;

  const meta = resolveLinkType(post.link_type);
  return {
    url: post.link_url,
    label: post.link_label?.trim() || meta.defaultLabel,
    type: meta.id,
  };
}
