"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  BANNER_INTERVAL,
  BANNER_VIDEO_GRACE,
  BANNER_VIDEO_SLACK,
  type Banner,
} from "@/lib/banners";
import { isVideoUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { usePreviewBanner, usePreviewMode } from "@/components/ui/PreviewMode";
import { BannerPlaybackProvider } from "./BannerPlayback";
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

  /**
   * What the current banner's video is doing, if it has one.
   *
   * Reset whenever the banner changes — the slide that just arrived has its own
   * video, and inheriting `ended` from the one before it would advance straight
   * past it.
   */
  const [clip, setClip] = useState<{
    duration: number | null;
    ended: boolean;
    failed: boolean;
  }>({ duration: null, ended: false, failed: false });

  const banner: Banner | undefined = banners[current];
  const isVideo = isVideoUrl(banner?.image);

  useEffect(() => {
    setClip({ duration: null, ended: false, failed: false });
  }, [current]);

  /**
   * How long this banner is EXPECTED to stay, in milliseconds.
   *
   * A picture holds for the fixed interval. A video holds for its own length,
   * because cutting a clip off before its end is the thing this is here to
   * stop — but every branch below still resolves to a NUMBER, and that is the
   * important part. Waiting on `ended` alone would mean a video that never
   * fires it stops the carousel for good, and the ways that can happen are
   * ordinary: an unsupported codec, a file that 404s, a connection that drops
   * mid-clip, a tab backgrounded long enough for the browser to stall it.
   *
   * So `ended` is treated as the fast path rather than the mechanism. When it
   * arrives the slide advances immediately; when it does not, one of these
   * numbers does the job a moment later.
   */
  const expected =
    !isVideo || clip.failed
      ? BANNER_INTERVAL
      : clip.duration !== null
        ? clip.duration * 1000 + BANNER_VIDEO_SLACK
        : BANNER_VIDEO_GRACE;

  /** The timer actually armed. Zero once the clip has said it is finished. */
  const hold = isVideo && clip.ended ? 0 : expected;

  /**
   * And what the pan is told, which is deliberately NOT `hold`.
   *
   * `hold` drops to zero the instant a clip ends, and the outgoing slide stays
   * on screen for the 0.6s crossfade — so handing it to a CSS animation would
   * snap the pan to its end position right as the banner starts fading, which
   * is a visible twitch on a phone. This never goes to zero, and before the
   * clip has reported its length it guesses the ordinary interval rather than
   * the fifteen-second grace, because a fifteen-second sweep on a banner that
   * turns out to run for four looks broken in the other direction.
   */
  const pan =
    isVideo && !clip.failed && clip.duration !== null
      ? clip.duration * 1000 + BANNER_VIDEO_SLACK
      : BANNER_INTERVAL;

  useEffect(() => {
    // Nothing to rotate between, someone else is driving, or the pointer is
    // resting on it — in the admin's preview it never advances at all, because a
    // banner sliding away mid-edit is the opposite of a preview.
    // Deliberately NOT paused by `viewing`: the picture that is open is a
    // snapshot of the banner it was opened from and does not change under the
    // reader, so the carousel behind it has no reason to stop — and closing
    // onto a page that has been frozen for a minute is its own kind of odd.
    if (controlled || preview || paused || banners.length < 2) return;

    /*
     * A timeout re-armed per slide, where this used to be one repeating
     * interval. It has to be, now that slides are not all the same length —
     * and it fixes something that was always slightly wrong: an interval kept
     * running when somebody clicked a dot, so a banner chosen by hand could be
     * replaced a few hundred milliseconds later. Each slide now gets its own
     * full turn.
     */
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % banners.length);
    }, hold);

    return () => window.clearTimeout(timer);
  }, [controlled, preview, paused, banners.length, hold, current]);

  /**
   * What the video inside the template is told, and what it reports back.
   *
   * `once` is off unless the carousel is actually rotating: a lone banner, or
   * one held open in the editor, has nowhere to advance to, and a clip that
   * stopped dead on its last frame there would look broken rather than
   * finished.
   */
  const playback = useMemo(
    () => ({
      once: !controlled && !preview && banners.length > 1,
      pan,
      onDuration: (id: string, seconds: number) =>
        setClip((value) =>
          // Guarded twice: against a report from the slide on its way out (see
          // BannerPlayback.tsx), and because a live stream reports Infinity
          // while a video the browser is unsure about reports NaN — either
          // would poison the hold.
          id === banner?.id && Number.isFinite(seconds) && seconds > 0
            ? { ...value, duration: seconds }
            : value
        ),
      onEnded: (id: string) =>
        setClip((value) => (id === banner?.id ? { ...value, ended: true } : value)),
      onFailed: (id: string) =>
        setClip((value) => (id === banner?.id ? { ...value, failed: true } : value)),
    }),
    [controlled, preview, banners.length, pan, banner?.id]
  );

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
            <BannerPlaybackProvider value={playback}>
              {TEMPLATES[banner.template]({ banner })}
            </BannerPlaybackProvider>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {header}

      {/* Dots only when there is somewhere to go. Controlled means the admin is
          driving, and a control that fights the editor is worse than none. */}
      {banners.length > 1 && !controlled ? (
        <div
          className={cn(
            // Wraps and keeps clear of both edges: the cap is 50 slides, and a
            // single unwrapped row of that many runs off a phone screen at both
            // ends, taking the last dots out of reach.
            "pointer-events-none absolute inset-x-0 z-20 flex flex-wrap justify-center gap-2 px-6 transition-all",
            // Lifted clear of the player bar, which is only on screen while
            // somebody is hovering — but the dots are moved for the whole
            // slide rather than only then, because dots that jump out of the
            // way as the cursor arrives are dots nobody can click.
            isVideo ? "bottom-16" : "bottom-5"
          )}
        >
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
