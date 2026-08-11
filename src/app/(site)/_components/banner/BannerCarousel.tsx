"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BANNER_INTERVAL, type Banner } from "@/lib/banners";
import type { LandingContent } from "@/lib/landingContent";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { usePreviewMode } from "@/components/ui/PreviewMode";
import { TEMPLATES } from "./templates";

/**
 * The top of the page: one banner at a time, crossfading.
 *
 * The header is rendered once, here, rather than inside each template — it is
 * laid over the photograph and must not fade out with the banner underneath it.
 *
 * The box has a fixed height so that changing template, or rotating to a banner
 * with more copy in it, never moves the rest of the page.
 *
 * `activeIndex` makes the carousel controlled: the admin passes the index of the
 * banner being edited so the preview shows that one and holds still. Left
 * undefined — which is what the live site does — it advances on its own.
 */
export function BannerCarousel({
  content,
  activeIndex,
}: {
  content: LandingContent;
  activeIndex?: number;
}) {
  const { banners } = content;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const preview = usePreviewMode();

  const controlled = activeIndex !== undefined;
  // Clamped rather than trusted: a banner can be deleted while its index is held.
  const current = banners.length
    ? Math.min(Math.max(controlled ? activeIndex : index, 0), banners.length - 1)
    : 0;

  useEffect(() => {
    // Nothing to rotate between, someone else is driving, or the pointer is
    // resting on it — in the admin's preview it never advances at all, because a
    // banner sliding away mid-edit is the opposite of a preview.
    if (controlled || preview || paused || banners.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % banners.length);
    }, BANNER_INTERVAL);

    return () => window.clearInterval(timer);
  }, [controlled, preview, paused, banners.length]);

  const banner: Banner | undefined = banners[current];

  return (
    <section
      className="relative min-h-[600px] overflow-hidden rounded-card lg:min-h-[680px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Highlights"
    >
      <AnimatePresence initial={false}>
        {banner ? (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
            aria-roledescription="slide"
            aria-label={`${current + 1} of ${banners.length}`}
          >
            {TEMPLATES[banner.template]({ banner })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SiteHeader content={content} />

      {/* Dots only when there is somewhere to go. Controlled means the admin is
          driving, and a control that fights the editor is worse than none. */}
      {banners.length > 1 && !controlled ? (
        <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center gap-2">
          {banners.map((entry, position) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Show banner ${position + 1}`}
              aria-current={position === current}
              className={
                position === current
                  ? "h-1.5 w-7 rounded-full bg-accent transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-white/45 transition-all hover:bg-white/80"
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
