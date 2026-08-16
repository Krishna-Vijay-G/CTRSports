"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BANNER_INTERVAL, type Banner } from "@/lib/banners";
import { usePreviewBanner, usePreviewMode } from "@/components/ui/PreviewMode";
import { BannerViewer, BannerViewerProvider } from "./BannerViewer";
import { TEMPLATES } from "./templates";

/**
 * The top of a page: one banner at a time, crossfading.
 *
 * The header is passed in and rendered once, here, rather than inside each
 * template — it is laid over the photograph and must not fade out with the
 * banner underneath it. Passed in rather than built here because the section is
 * chosen by the registry and cannot know what chrome the site around it wears.
 *
 * The box has a fixed height so that changing template, or rotating to a banner
 * with more copy in it, never moves the rest of the page.
 *
 * In the console's preview the carousel is CONTROLLED: it holds on whichever
 * banner is open in the editor and does not advance. That index arrives through
 * the preview context rather than as a prop, because there is no prop path from
 * the editor to a section the registry picked. On the live site there is no
 * such context and the carousel rotates on its own.
 */
export function BannerCarousel({
  banners,
  header,
}: {
  banners: Banner[];
  header: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /** The banner being looked at full size, if any. See BannerViewer. */
  const [viewing, setViewing] = useState<Banner | null>(null);
  const preview = usePreviewMode();
  const activeIndex = usePreviewBanner();

  const controlled = activeIndex !== undefined;
  // Clamped rather than trusted: a banner can be deleted while its index is held.
  const current = banners.length
    ? Math.min(Math.max(controlled ? activeIndex : index, 0), banners.length - 1)
    : 0;

  useEffect(() => {
    // Nothing to rotate between, someone else is driving, or the pointer is
    // resting on it — in the admin's preview it never advances at all, because a
    // banner sliding away mid-edit is the opposite of a preview.
    // Deliberately NOT paused by `viewing`: the picture that is open is a
    // snapshot of the banner it was opened from and does not change under the
    // reader, so the carousel behind it has no reason to stop — and closing
    // onto a page that has been frozen for a minute is its own kind of odd.
    if (controlled || preview || paused || banners.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % banners.length);
    }, BANNER_INTERVAL);

    return () => window.clearInterval(timer);
  }, [controlled, preview, paused, banners.length]);

  const banner: Banner | undefined = banners[current];

  return (
    <BannerViewerProvider onOpen={setViewing}>
    <section
      // bg-surface so a photograph set to "Fit" letterboxes against the card's
      // own colour rather than against whatever happens to be behind it.
      className="relative min-h-[600px] overflow-hidden rounded-card bg-surface lg:min-h-[680px]"
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

      {header}

      {/* Dots only when there is somewhere to go. Controlled means the admin is
          driving, and a control that fights the editor is worse than none. */}
      {banners.length > 1 && !controlled ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center gap-2">
          {banners.map((entry, position) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Show banner ${position + 1}`}
              aria-current={position === current}
              className={
                position === current
                  ? "pointer-events-auto h-1.5 w-7 rounded-full bg-accent transition-all"
                  : "pointer-events-auto h-1.5 w-1.5 rounded-full bg-white/45 transition-all hover:bg-white/80"
              }
            />
          ))}
        </div>
      ) : null}

      {viewing ? <BannerViewer banner={viewing} onClose={() => setViewing(null)} /> : null}
    </section>
    </BannerViewerProvider>
  );
}
