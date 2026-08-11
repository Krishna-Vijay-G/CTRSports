"use client";

import { motion } from "framer-motion";
import type { Banner, BannerTemplate } from "@/lib/banners";
import { ActionButton } from "@/components/ui/ActionButton";

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

function Photo({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      // The page's LCP element — fetched at high priority, never lazily.
      fetchPriority="high"
      decoding="async"
      className={className ?? "absolute inset-0 h-full w-full object-cover"}
    />
  );
}

/* ───────────────────────────── Spotlight ───────────────────────────── */

function SpotlightBanner({ banner }: BannerProps) {
  return (
    <>
      <Photo src={banner.image} />
      {/* Two washes: one seats the copy against the bottom, one holds the
          left-aligned headline legible. Deliberately light — heavy enough to
          read the type, not so heavy the photograph turns into a black panel. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1180px] flex-col justify-end px-5 pb-10 pt-28 sm:px-8 lg:max-w-[52%] lg:pe-0 lg:ps-8">
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
      <Photo src={banner.image} />
      {/* Heavier than spotlight's: centred type crosses the middle of the
          photograph, where a picture is usually at its busiest. */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

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
      <Photo src={banner.image} className="absolute inset-0 h-full w-full object-cover lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[52%]" />
      <div className="absolute inset-0 bg-black/60 lg:hidden" />
      {/* On lg the panel is opaque, so the seam gets a soft edge rather than a line. */}
      <div className="absolute inset-y-0 left-0 hidden w-[56%] bg-gradient-to-r from-surface via-surface to-transparent lg:block" />
      {/* The header is laid over this template too, and on the photo half it
          would otherwise sit on whatever the sky happens to be. Deep enough to
          still be dark at the nav's own line, not just at the very top edge. */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/85 via-black/45 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1180px] flex-col justify-center px-5 pb-10 pt-28 sm:px-8 lg:max-w-none lg:pe-[52%] lg:ps-10">
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
