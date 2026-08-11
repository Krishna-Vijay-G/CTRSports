/**
 * The banners at the top of a page.
 *
 * A banner is a photo, a headline, a line of supporting copy and one link — and
 * a TEMPLATE, which decides how those four are arranged. Several banners rotate
 * in place.
 *
 * The templates are the point. Rather than one layout with a dozen toggles for
 * alignment, overlay strength and where the button goes, there are a few named
 * arrangements that are each known to look right. Picking one is a single
 * decision, and no combination of settings can produce something broken.
 *
 * Not tied to one page: the landing document and the INCRC document both hold a
 * list of these, and both use the same carousel, the same templates and the same
 * admin panel. Banners live inside their page's document rather than a table of
 * their own — they are page furniture, always read with the rest of the page,
 * and nothing ever queries them.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { BANNER_PHOTOS } from "@/config/images";
import { BODY_MAX, image, link, optionalText } from "@/lib/normalise";

export const BANNER_TEMPLATES = ["spotlight", "centre", "split"] as const;
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
    description: "Full-bleed photo, copy along the bottom-left. The loudest of the three.",
  },
  centre: {
    name: "Centre",
    description: "Copy centred over a darkened photo. Best for one short line.",
  },
  split: {
    name: "Split",
    description: "Copy in a panel on the left, photo on the right. Reads well on a bright photo.",
  },
};

export const MAX_BANNERS = 6;

/** How long each banner holds before the next one, in milliseconds. */
export const BANNER_INTERVAL = 6500;

export function isBannerTemplate(value: unknown): value is BannerTemplate {
  return (BANNER_TEMPLATES as readonly string[]).includes(value as string);
}

/**
 * A new, empty banner. The caller supplies the id — only it knows what is unique
 * — and the link, because a sensible destination differs page to page.
 */
export function blankBanner(id: string, ctaHref = "#"): Banner {
  return {
    id,
    template: "spotlight",
    image: BANNER_PHOTOS[0],
    title: "",
    subtitle: "",
    ctaLabel: "",
    ctaHref,
  };
}

export const DEFAULT_BANNERS: Banner[] = [
  {
    id: "banner-1",
    template: "spotlight",
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

/**
 * Turns whatever is in the stored document into banners that will render.
 *
 * An empty list is allowed and means no banners — the page then opens on its
 * first section, which is a real editorial choice. Only a MISSING or wrong-typed
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
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .slice(0, MAX_BANNERS)
    .map((entry, index) => {
      const wanted = optionalText(entry.id, 64);
      const id = wanted && !seen.has(wanted) ? wanted : `banner-${index + 1}-${seen.size}`;
      seen.add(id);

      return {
        id,
        // A stored "showcase" — the template this used to be paired with a
        // floating card — falls back to spotlight along with anything else
        // unrecognised, which is what makes removing a template safe.
        template: isBannerTemplate(entry.template) ? entry.template : "spotlight",
        image: image(entry.image, BANNER_PHOTOS[0]),
        title: optionalText(entry.title, BODY_MAX),
        subtitle: optionalText(entry.subtitle),
        ctaLabel: optionalText(entry.ctaLabel),
        // "#" rather than a page-specific anchor: this function is shared, and a
        // banner with no usable link should go nowhere rather than somewhere the
        // other page happens to have.
        ctaHref: link(entry.ctaHref, "#"),
      };
    });
}
