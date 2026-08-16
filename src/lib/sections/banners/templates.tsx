"use client";

import { motion } from "framer-motion";
import {
  BANNER_INTERVAL,
  fitCrops,
  type Banner,
  type BannerFit,
  type BannerFocus,
  type BannerTemplate,
} from "@/lib/banners";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/ui/ActionButton";
import { useBannerViewer } from "./BannerViewer";
import { Media } from "@/components/ui/Media";

/**
 * The banner layouts, and the lookup that picks between them.
 *
 * Every template takes exactly the same props and fills the same box, so
 * switching one for another changes nothing but the arrangement — no template
 * can be taller than another and make the page jump as the banners rotate.
 *
 * Adding one is: write the component, add it to TEMPLATES, add its id to
 * BANNER_TEMPLATES and a line to BANNER_TEMPLATE_META in src/lib/banners.ts.
 * The admin's picker is generated from that metadata, so it appears on its own.
 */

export type BannerProps = {
  banner: Banner;
};

/** The copy rises as a banner comes in. Slower than a hover, quicker than a page load. */
const rise = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

/**
 * How the picture fills its box, and which part survives a crop.
 *
 * Static classes in a lookup rather than assembled from the stored value:
 * Tailwind reads the source to decide what to build, so a class put together at
 * runtime is not in the stylesheet at all.
 *
 * `zoom` is `fill` with a scale on top. The transform is what pushes in — the
 * image is already covering the box, so scaling it up simply shows less of it.
 */
const FIT_CLASS: Record<BannerFit, string> = {
  fill: "object-cover",
  zoom: "object-cover scale-[1.18]",
  /*
   * Fit is the one that changes with the screen.
   *
   * On a wide screen it shows the whole picture, which is what it is for. On a
   * phone that same rule left a wide picture as a thin strip across the middle
   * of a tall box with blurred nothing above and below it — a banner that
   * looked like it had failed to load rather than one shown whole. So below
   * `md` it fills the height instead: the picture touches the top and the
   * bottom, runs off both sides, and travels across them — see `banner-pan`.
   * Nothing is lost, because everything that runs off the side is what the pan
   * then shows.
   */
  fit: "object-cover md:object-contain",
  stretch: "object-fill",
};

const FOCUS_CLASS: Record<BannerFocus, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

/**
 * The vertical half of the focus, for the phone pan to hold on to.
 *
 * The pan owns the horizontal — that is the whole of what it does — so only the
 * up-and-down part of the chosen focus survives it. A photo pinned to the top
 * pans along its top edge instead of drifting back to the middle.
 */
const PAN_Y: Record<BannerFocus, string> = {
  center: "50%",
  top: "0%",
  bottom: "100%",
  left: "50%",
  right: "50%",
};

/**
 * The photograph, and — when it is set to Fit — the blurred backdrop behind it.
 *
 * A wide graphic in a tall box leaves space at the sides, and flat colour there
 * reads as a mistake: the banner looks like a picture that failed to load
 * rather than one deliberately shown whole. So the same picture is drawn twice.
 * The one behind fills the box, blown up and blurred past recognition, and the
 * real one sits on top of it at its own proportions. What was empty becomes the
 * photograph's own colours, and a poster with type on it can be shown entire
 * without a black bar either side of it.
 *
 * It costs no extra download: same `src`, so the browser fetches it once and
 * paints it twice.
 *
 * It is hidden below `md`, where Fit fills the height and leaves no space for a
 * backdrop to fill — painting a blurred copy behind a picture that covers it
 * completely is a full-screen blur nobody can see.
 *
 * The scale is what keeps it clean — a blur samples past the edge of its
 * element and would otherwise fade to transparent along the boundary, leaving a
 * pale seam exactly where the frame is.
 */
function Photo({ banner, className }: { banner: Banner; className?: string }) {
  const box = cn("absolute inset-0 h-full w-full", className);
  const crops = fitCrops(banner.fit);
  const open = useBannerViewer();

  return (
    <>
      {banner.fit === "fit" ? (
        <Media
          src={banner.image}
          alt=""
          aria-hidden
          decoding="async"
          className={cn(box, "hidden scale-110 object-cover blur-2xl md:block")}
        />
      ) : null}

      <Media
        src={banner.image}
        alt=""
        aria-hidden
        // The banner is the one slot on the page where a video is the point, so
        // it is the one that offers the sound. The blurred backdrop above is the
        // same file drawn twice and must not offer a second.
        sound
        // The page's LCP element — fetched at high priority, never lazily.
        fetchPriority="high"
        decoding="async"
        // The pan reads both of these; on a wide screen it is not running and
        // they do nothing. The sweep takes exactly as long as the banner is
        // held, so it arrives at the far edge as the next one takes over.
        style={
          {
            "--banner-pan-y": PAN_Y[banner.focus],
            "--banner-pan-duration": `${BANNER_INTERVAL}ms`,
          } as React.CSSProperties
        }
        className={cn(
          box,
          FIT_CLASS[banner.fit],
          // Where the picture sits only means something when something is being
          // cut off. Fit and Stretch centre it, whatever `focus` last held from
          // a spell on one of the cropping modes.
          FOCUS_CLASS[crops ? banner.focus : "center"],
          /*
           * Anything with something off the side of the box travels across it —
           * see the `banner-pan` note in globals.css, which also confines this
           * to phone widths. That now includes Fit, which crops horizontally
           * below `md`; on a wide screen the class is inert, which is exactly
           * right, because there it shows the whole picture and has nothing to
           * travel to. Stretch never pans: it distorts to fit and cuts nothing.
           */
          (crops || banner.fit === "fit") && "banner-pan"
        )}
      />

      {/*
        The picture, made clickable.
        
        A banner box is a window onto a photograph rather than the photograph —
        every mode but Stretch cuts something off — so opening the whole thing
        is worth a click. It is a button covering exactly the photo, sitting in
        the same stacking context as the images and therefore UNDER the copy,
        which is `relative z-10`: the headline, the subtitle and the call to
        action keep working, and everything around them opens the picture.

        `open` is null when no carousel is providing a viewer, which is how the
        admin's preview renders this with nothing to click.
      */}
      {open ? (
        <button
          type="button"
          onClick={() => open(banner)}
          aria-label={
            banner.title ? `View the full picture: ${banner.title}` : "View the full picture"
          }
          className={cn(box, "cursor-zoom-in")}
        />
      ) : null}
    </>
  );
}

/**
 * The black washes over a photograph, as one switchable group.
 *
 * Wrapping them rather than writing a second set of classes per template: the
 * templates each stack two or three gradients that were tuned together, and
 * scaling the whole group's opacity keeps that balance. `light` is half; `none`
 * removes them from the page entirely rather than making them transparent, so
 * nothing is left sitting over the photograph catching the pointer.
 *
 * What is NOT in here is anything structural — the split template's left panel
 * is how that layout works, not a wash over a picture, so it stays whatever
 * this is set to.
 */
function Scrim({ overlay, children }: { overlay: Banner["overlay"]; children: React.ReactNode }) {
  if (overlay === "none") return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0", overlay === "light" && "opacity-50")}>
      {children}
    </div>
  );
}

/* ───────────────────────────── Spotlight ───────────────────────────── */

function SpotlightBanner({ banner }: BannerProps) {
  return (
    <>
      <Photo banner={banner} />
      {/* Two washes: one seats the copy against the bottom, one holds the
          left-aligned headline legible. Deliberately light — heavy enough to
          read the type, not so heavy the photograph turns into a black panel. */}
      <Scrim overlay={banner.overlay}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
      </Scrim>

      <div className="relative z-10 mx-auto flex h-full max-w-[1560px] flex-col justify-end px-5 pb-10 pt-28 sm:px-8 lg:max-w-[52%] lg:pe-0 lg:ps-8">
        <motion.h2
          {...rise}
          className="headline whitespace-pre-line text-[clamp(2.25rem,5.4vw,3.75rem)] text-white"
        >
          {banner.title}
        </motion.h2>

        {banner.subtitle ? (
          <motion.p
            {...rise}
            transition={{ ...rise.transition, delay: 0.08 }}
            className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base"
          >
            {banner.subtitle}
          </motion.p>
        ) : null}

        {banner.ctaLabel ? (
          <motion.div {...rise} transition={{ ...rise.transition, delay: 0.16 }} className="mt-7">
            <ActionButton href={banner.ctaHref}>{banner.ctaLabel}</ActionButton>
          </motion.div>
        ) : null}
      </div>
    </>
  );
}

/* ────────────────────────────── Centre ────────────────────────────── */

function CentreBanner({ banner }: BannerProps) {
  return (
    <>
      <Photo banner={banner} />
      {/* Heavier than spotlight's: centred type crosses the middle of the
          photograph, where a picture is usually at its busiest. */}
      <Scrim overlay={banner.overlay}>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      </Scrim>

      <div className="relative z-10 mx-auto flex h-full max-w-[820px] flex-col items-center justify-center px-5 pb-10 pt-28 text-center sm:px-8">
        <motion.h2
          {...rise}
          className="headline whitespace-pre-line text-[clamp(2rem,4.8vw,3.5rem)] text-white"
        >
          {banner.title}
        </motion.h2>

        {banner.subtitle ? (
          <motion.p
            {...rise}
            transition={{ ...rise.transition, delay: 0.08 }}
            className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base"
          >
            {banner.subtitle}
          </motion.p>
        ) : null}

        {banner.ctaLabel ? (
          <motion.div {...rise} transition={{ ...rise.transition, delay: 0.16 }} className="mt-8">
            <ActionButton href={banner.ctaHref}>{banner.ctaLabel}</ActionButton>
          </motion.div>
        ) : null}
      </div>
    </>
  );
}

/* ─────────────────────────────── Split ─────────────────────────────── */

function SplitBanner({ banner }: BannerProps) {
  return (
    <>
      {/* The photo takes the right half from lg: up. Below that it is the whole
          panel with the copy over it, because half a phone screen is not a
          photograph. */}
      <Photo banner={banner} className="lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[52%]" />

      {/* Not part of the wash: on lg the copy sits ON this panel, so it is how
          the layout works rather than something laid over a photograph. It
          stays whatever the overlay is set to — without it there is no split. */}
      <div className="absolute inset-y-0 left-0 hidden w-[56%] bg-gradient-to-r from-surface via-surface to-transparent lg:block" />

      <Scrim overlay={banner.overlay}>
        {/* Below lg the photo is the whole panel with the copy over it. */}
        <div className="absolute inset-0 bg-black/60 lg:hidden" />
        {/* The header is laid over this template too, and on the photo half it
            would otherwise sit on whatever the sky happens to be. Deep enough to
            still be dark at the nav's own line, not just at the very top edge. */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/85 via-black/45 to-transparent" />
      </Scrim>

      <div className="relative z-10 mx-auto flex h-full max-w-[1560px] flex-col justify-center px-5 pb-10 pt-28 sm:px-8 lg:max-w-none lg:pe-[52%] lg:ps-10">
        <motion.h2
          {...rise}
          className="headline whitespace-pre-line text-[clamp(2rem,4.4vw,3.25rem)] text-white"
        >
          {banner.title}
        </motion.h2>

        {banner.subtitle ? (
          <motion.p
            {...rise}
            transition={{ ...rise.transition, delay: 0.08 }}
            className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted sm:text-base"
          >
            {banner.subtitle}
          </motion.p>
        ) : null}

        {banner.ctaLabel ? (
          <motion.div {...rise} transition={{ ...rise.transition, delay: 0.16 }} className="mt-7">
            <ActionButton href={banner.ctaHref}>{banner.ctaLabel}</ActionButton>
          </motion.div>
        ) : null}
      </div>
    </>
  );
}

/* ───────────────────────────── The lookup ───────────────────────────── */

export const TEMPLATES: Record<BannerTemplate, (props: BannerProps) => React.ReactNode> = {
  spotlight: SpotlightBanner,
  centre: CentreBanner,
  split: SplitBanner,
};
