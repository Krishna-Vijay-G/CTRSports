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

import { PLACEHOLDER_PHOTO } from "@/config/images";
import { BODY_MAX, image, link, oneOf, optionalText } from "@/lib/normalise";

export const BANNER_TEMPLATES = ["spotlight", "centre", "split"] as const;
export type BannerTemplate = (typeof BANNER_TEMPLATES)[number];

/**
 * How the photograph fills the banner's box.
 *
 * The box is a fixed height, so a photograph almost never matches it and
 * something has to give: either part of the picture, or its proportions, or the
 * edges of the frame. These are the four ways to decide which.
 *
 *   fill     the frame is filled and the overflow is cropped. Proportions kept.
 *            Right for nearly every photograph, and the default.
 *   zoom     the same, pushed in further. For a photo whose subject is small in
 *            the frame, or when the edges are not worth keeping.
 *   fit      the whole picture, with a blown-up blurred copy of itself filling
 *            whatever space is left over. Right for artwork or a poster where
 *            cropping would cut off type — nothing is lost, and the leftover
 *            space is the picture's own colours rather than a black bar.
 *            ON A PHONE it behaves differently, and deliberately: a wide
 *            picture shown whole in a tall box is a thin strip across the
 *            middle with blur above and below it, which reads as a banner that
 *            failed to load. So below `md` it fills the height — touching top
 *            and bottom, running off both sides — and travels across itself,
 *            so everything that runs off the side is still seen.
 *   stretch  the frame is filled exactly by distorting the picture. Included
 *            because it is sometimes what a flat graphic wants; on a photograph
 *            of a person it is always wrong, and the admin says so.
 */
export const BANNER_FITS = ["fill", "zoom", "fit", "stretch"] as const;
export type BannerFit = (typeof BANNER_FITS)[number];

/**
 * Which part of the picture is kept when it is cropped.
 *
 * Only means anything for `fill` and `zoom` — the other two crop nothing. A
 * photograph with the horizon high in the frame, or a driver's head near the
 * top, is the case this exists for: the default centre crop cuts exactly the
 * part that matters.
 */
export const BANNER_FOCUS = ["center", "top", "bottom", "left", "right"] as const;
export type BannerFocus = (typeof BANNER_FOCUS)[number];

/**
 * How much of the black wash goes over the photograph.
 *
 * The washes are not decoration: white type over an unmodified photograph is
 * unreadable wherever the picture happens to be pale, and the site HEADER is
 * laid over this box too. `none` is offered because a photo that is already
 * dark needs nothing — but it is the one setting here that can make a page
 * unreadable, so the admin warns rather than just obeying.
 */
export const BANNER_OVERLAYS = ["normal", "light", "none"] as const;
export type BannerOverlay = (typeof BANNER_OVERLAYS)[number];

export type Banner = {
  /** Stable across reorders — it is the React key and the drag identity. */
  id: string;
  template: BannerTemplate;
  image: string;
  /** How the photograph fills the box. */
  fit: BannerFit;
  /** Which part survives the crop. Ignored by `fit` and `stretch`. */
  focus: BannerFocus;
  /** How dark the wash over it is. */
  overlay: BannerOverlay;
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

/** What the admin's picture controls show. */
export const BANNER_FIT_META: Record<BannerFit, { name: string; description: string }> = {
  fill: {
    name: "Fill",
    description: "Fills the box and crops what does not fit. Proportions kept.",
  },
  zoom: {
    name: "Zoom",
    description: "The same, pushed in closer. For a subject that sits small in the frame.",
  },
  fit: {
    name: "Fit",
    description:
      "The whole picture, nothing cropped. A blurred copy of it fills the space left over. On a phone it fills the height instead and pans across, so nothing is a thin strip in the middle.",
  },
  stretch: {
    name: "Stretch",
    description: "Fills the box exactly by distorting the picture. Wrong for photographs.",
  },
};

export const BANNER_FOCUS_LABELS: Record<BannerFocus, string> = {
  center: "Middle",
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
};

export const BANNER_OVERLAY_META: Record<BannerOverlay, { name: string; description: string }> = {
  normal: { name: "Normal", description: "The wash the template was drawn with." },
  light: { name: "Light", description: "Half as dark. For a photo that is already moody." },
  none: { name: "None", description: "No wash at all. Check the header is still readable." },
};

/** Whether this way of filling the box crops anything, and so reads `focus`. */
export function fitCrops(fit: BannerFit): boolean {
  return fit === "fill" || fit === "zoom";
}

export const MAX_BANNERS = 6;

/** How long each banner holds before the next one, in milliseconds. */
export const BANNER_INTERVAL = 6500;

/**
 * A banner holding a video runs for as long as the video does, not for
 * `BANNER_INTERVAL` — a clip cut off two seconds before its end is worse than
 * no clip. These two numbers are what keep that from becoming a carousel that
 * never moves again.
 *
 * A video reports its own length, and the slide is held for that plus SLACK —
 * enough to cover the gap between the last frame and the `ended` event, and to
 * absorb a short stall, without leaving a frozen frame on screen for long. The
 * event still advances the slide the moment it arrives; this is only the
 * backstop for when it does not.
 *
 * GRACE is the other end: a video that has not even reported its length is one
 * that may never load at all — a codec the browser will not decode, a file that
 * 404s, a connection that died mid-fetch. After it, the slide rotates on the
 * ordinary clock rather than waiting for something that is not coming.
 */
export const BANNER_VIDEO_SLACK = 2500;
export const BANNER_VIDEO_GRACE = 15000;

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
    image: PLACEHOLDER_PHOTO,
    ...BANNER_PICTURE_DEFAULTS,
    title: "",
    subtitle: "",
    ctaLabel: "",
    ctaHref,
  };
}

/**
 * What every banner had before the picture could be adjusted.
 *
 * Exported so the two documents' built-in banners spread it rather than
 * repeating three fields six times — and so "the way banners looked before
 * these settings existed" has one definition.
 */
export const BANNER_PICTURE_DEFAULTS = {
  fit: "fill",
  focus: "center",
  overlay: "normal",
} as const;

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
        image: image(entry.image, PLACEHOLDER_PHOTO),
        // A banner saved before the picture could be adjusted has none of these,
        // and falls back to exactly what it was already being drawn with — so
        // this reads back as no change at all on every existing document.
        fit: oneOf(entry.fit, BANNER_FITS, BANNER_PICTURE_DEFAULTS.fit),
        focus: oneOf(entry.focus, BANNER_FOCUS, BANNER_PICTURE_DEFAULTS.focus),
        overlay: oneOf(entry.overlay, BANNER_OVERLAYS, BANNER_PICTURE_DEFAULTS.overlay),
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
