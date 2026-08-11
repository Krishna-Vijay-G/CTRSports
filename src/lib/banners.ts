/**
 * The banners at the top of the landing page.
 *
 * This replaces what used to be a single hardcoded "hero". A banner is a photo,
 * a headline, a line of supporting copy and one link — and a TEMPLATE, which
 * decides how those four are arranged. Several banners rotate in place.
 *
 * The templates are the point. Rather than one layout with a dozen toggles for
 * alignment, overlay strength and where the button goes, there are four named
 * arrangements that are each known to look right. Picking one is a single
 * decision, and no combination of settings can produce something broken.
 *
 * Banners live inside the landing document (`ctr_content`), not a table of their
 * own: they are page furniture, they are always read together with the rest of
 * the page, and nothing ever queries them.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { BANNER_PHOTOS } from "@/config/images";

export const BANNER_TEMPLATES = ["spotlight", "centre", "split", "showcase"] as const;
export type BannerTemplate = (typeof BANNER_TEMPLATES)[number];

export type Banner = {
  /** Stable across reorders — it is the React key and the drag identity. */
  id: string;
  template: BannerTemplate;
  image: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

/** What the admin's template picker shows. */
export const BANNER_TEMPLATE_META: Record<
  BannerTemplate,
  { name: string; description: string }
> = {
  spotlight: {
    name: "Spotlight",
    description: "Full-bleed photo, copy along the bottom-left. The loudest of the four.",
  },
  centre: {
    name: "Centre",
    description: "Copy centred over a darkened photo. Best for one short line.",
  },
  split: {
    name: "Split",
    description: "Copy in a panel on the left, photo on the right. Reads well on a bright photo.",
  },
  showcase: {
    name: "Showcase",
    description: "Spotlight, plus a card listing the first few sports over the right.",
  },
};

export const MAX_BANNERS = 6;
const TEXT_MAX = 240;
const BODY_MAX = 3000;
const URL_MAX = 600;

/** How long each banner holds before the next one, in milliseconds. */
export const BANNER_INTERVAL = 6500;

export function isBannerTemplate(value: unknown): value is BannerTemplate {
  return (BANNER_TEMPLATES as readonly string[]).includes(value as string);
}

/** A new, empty banner. The caller supplies the id — only it knows what is unique. */
export function blankBanner(id: string): Banner {
  return {
    id,
    template: "spotlight",
    image: BANNER_PHOTOS[0],
    title: "",
    subtitle: "",
    ctaLabel: "",
    ctaHref: "#sports",
  };
}

export const DEFAULT_BANNERS: Banner[] = [
  {
    id: "banner-1",
    template: "showcase",
    image: BANNER_PHOTOS[0],
    title: "One Nation. One Championship.",
    subtitle: "Six programmes competing under one banner.",
    ctaLabel: "Explore Sports",
    ctaHref: "#sports",
  },
  {
    id: "banner-2",
    template: "centre",
    image: BANNER_PHOTOS[1],
    title: "Built for athletes, run like one team",
    subtitle: "One standard of preparation across every discipline CTR runs.",
    ctaLabel: "About CTR",
    ctaHref: "#about",
  },
  {
    id: "banner-3",
    template: "split",
    image: BANNER_PHOTOS[2],
    title: "From karting to full circuit racing",
    subtitle: "A national ladder that takes drivers all the way through.",
    ctaLabel: "See the programmes",
    ctaHref: "#sports",
  },
];

/* ─────────────────────────── Normalisation ─────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function text(value: unknown, max = TEXT_MAX): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

/**
 * A blank photo would render as a broken image and a banner is mostly photo, so
 * an unusable one falls back to a default rather than to nothing. `//` is
 * rejected along with everything that is not a path or http(s), which is what
 * keeps a `javascript:` payload out of an <img src>.
 */
function image(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed || trimmed.startsWith("//")) return fallback;
  return trimmed.startsWith("/") || isHttpUrl(trimmed) ? trimmed : fallback;
}

/** Same rule as a photo, plus in-page anchors, which is what most banners link to. */
function link(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  return isHttpUrl(trimmed) ? trimmed : fallback;
}

/**
 * Turns whatever is in the stored document into banners that will render.
 *
 * An empty list is allowed and means no banners — the page then opens on the
 * about section, which is a real editorial choice. Only a MISSING or wrong-typed
 * list falls back to the defaults.
 *
 * Ids are made unique here rather than trusted: two banners sharing one id would
 * make React reuse the wrong element on reorder, and the drag would move the
 * wrong card.
 */
export function normaliseBanners(value: unknown, fallback: Banner[]): Banner[] {
  if (!Array.isArray(value)) return fallback.map((banner) => ({ ...banner }));

  const seen = new Set<string>();

  return value
    .filter(isRecord)
    .slice(0, MAX_BANNERS)
    .map((entry, index) => {
      const wanted = text(entry.id, 64);
      const id = wanted && !seen.has(wanted) ? wanted : `banner-${index + 1}-${seen.size}`;
      seen.add(id);

      return {
        id,
        template: isBannerTemplate(entry.template) ? entry.template : "spotlight",
        image: image(entry.image, BANNER_PHOTOS[0]),
        title: text(entry.title, BODY_MAX),
        subtitle: text(entry.subtitle),
        ctaLabel: text(entry.ctaLabel),
        ctaHref: link(entry.ctaHref, "#sports"),
      };
    });
}
