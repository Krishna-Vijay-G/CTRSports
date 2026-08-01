"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaPost } from "@/lib/posts";
import { BannerTemplate } from "@/components/landing/BannerTemplates";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 7000;

function Arrow({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "next" ? "M3 8h9M9 4l4 4-4 4" : "M13 8H4M7 4L3 8l4 4"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z" />
      {muted ? (
        <path d="M16 9.5l4.5 5M20.5 9.5L16 14.5" />
      ) : (
        <>
          <path d="M15.5 9.4a3.4 3.4 0 0 1 0 5.2" />
          <path d="M18 7a6.8 6.8 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

export function PostBanners({ posts }: { posts: MediaPost[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const total = posts.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (total < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [total, paused, reducedMotion]);

  if (total === 0) return null;

  const post = posts[index];
  const autoplaying = total > 1 && !paused && !reducedMotion;

  return (
    <section
      id="latest"
      aria-label="Latest posts"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden bg-carbon-950"
      // Hovering does not pause — only keyboard focus does, so a user tabbing
      // through the controls is not interrupted mid-interaction.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative h-[76svh] min-h-[540px] max-h-[780px]">
        {/* `wait` rather than a crossfade: two slides overlapping at partial
            opacity ghosts the headline text into an unreadable double image. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <BannerTemplate post={post} muted={muted} reducedMotion={reducedMotion} />

            {/* Seams into the sections above and below, shared by every template. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-carbon-950 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-carbon-950/80 to-transparent"
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Controls ── */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-7 sm:px-6">
            <div className="pointer-events-auto flex items-center gap-2.5">
              {total > 1
                ? posts.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Show post ${i + 1}: ${item.title}`}
                      aria-current={i === index}
                      className="group py-2"
                    >
                      <span
                        className={cn(
                          "block h-[3px] rounded-full transition-all duration-300",
                          i === index
                            ? "w-11 bg-racing-yellow"
                            : "w-5 bg-white/30 group-hover:bg-white/60"
                        )}
                      />
                    </button>
                  ))
                : null}
              {total > 1 ? (
                <span className="ml-2 font-display text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
              ) : null}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {post.media_type === "video" ? (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute video" : "Mute video"}
                  aria-pressed={!muted}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-carbon-950/40 text-white/75 backdrop-blur-sm transition hover:border-racing-yellow/70 hover:text-racing-yellow"
                >
                  <SoundIcon muted={muted} />
                </button>
              ) : null}

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    aria-label="Previous post"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-carbon-950/40 text-white/75 backdrop-blur-sm transition hover:border-racing-yellow/70 hover:text-racing-yellow"
                  >
                    <Arrow direction="prev" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    aria-label="Next post"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-carbon-950/40 text-white/75 backdrop-blur-sm transition hover:border-racing-yellow/70 hover:text-racing-yellow"
                  >
                    <Arrow direction="next" />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Autoplay progress rail. */}
          {total > 1 ? (
            <div className="h-[3px] w-full bg-white/[0.07]">
              {autoplaying ? (
                <motion.div
                  key={`${post.id}-progress`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                  className="h-full bg-racing-yellow"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {post.title}
      </div>
    </section>
  );
}
