"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 7000;

/** Diagonal wedge the artwork is cut along on desktop — the deck's speed motif. */
const WEDGE = "md:[clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)]";

function InstagramGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

export function PostBanners({ posts }: { posts: MediaPost[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
      aria-labelledby="latest-heading"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden bg-carbon-950"
      // Hovering does not pause — only keyboard focus does, so a user tabbing
      // through the controls is not interrupted mid-interaction.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative h-[76svh] min-h-[540px] max-h-[780px]">
        <AnimatePresence initial={false}>
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* ── Artwork: full-bleed cover, cut along the wedge on desktop ── */}
            <div className={cn("absolute inset-0 md:left-auto md:right-0 md:w-[66%]", WEDGE)}>
              <motion.img
                src={post.image_url}
                alt={post.title}
                initial={reducedMotion ? undefined : { scale: 1.09 }}
                animate={reducedMotion ? undefined : { scale: 1 }}
                transition={{ duration: 9, ease: "linear" }}
                className="h-full w-full object-cover object-center"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>

            {/* ── Diagonal scrim: opaque behind the copy, clear over the artwork ── */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(178deg,rgba(10,10,10,0.94)_8%,rgba(10,10,10,0.72)_38%,rgba(10,10,10,0.40)_62%,rgba(10,10,10,0.86)_100%)] md:bg-[linear-gradient(101deg,#0A0A0A_0%,#0A0A0A_26%,rgba(10,10,10,0.88)_40%,rgba(10,10,10,0.42)_56%,rgba(10,10,10,0.06)_74%,transparent_88%)]"
            />

            {/* Gold sheen running along the wedge. */}
            <div
              aria-hidden
              className="absolute inset-0 hidden md:block md:bg-[linear-gradient(101deg,transparent_28%,rgba(247,214,25,0.16)_35%,rgba(247,214,25,0.03)_41%,transparent_48%)]"
            />

            {/* Seam into the sections above and below. */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-carbon-950 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-carbon-950/80 to-transparent"
            />

            {/* ── Copy: title top-left, subtext beneath ── */}
            <div className="absolute inset-0">
              <div className="mx-auto flex h-full max-w-6xl flex-col justify-center px-5 pb-24 pt-16 sm:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="max-w-xl"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-racing-yellow">
                      Latest from CTR
                    </span>
                    <span aria-hidden className="h-px w-8 bg-racing-yellow/40" />
                    <span className="font-display text-[11px] uppercase tracking-[0.18em] text-white/50">
                      {formatPostDate(post.published_at)}
                    </span>
                  </div>

                  <h2
                    id="latest-heading"
                    className="mt-4 font-display text-[clamp(1.9rem,4.6vw,3.6rem)] font-bold uppercase leading-[0.98] tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
                  >
                    {post.title}
                  </h2>

                  {/* Clamped so a long caption can never overflow the fixed-height frame. */}
                  {post.subtext ? (
                    <p className="mt-4 line-clamp-4 max-w-lg whitespace-pre-line text-sm leading-relaxed text-white/75 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-base md:line-clamp-6">
                      {post.subtext}
                    </p>
                  ) : null}

                  {post.instagram_url ? (
                    <a
                      href={post.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-7 inline-flex items-center gap-2 rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-semibold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-10px_rgba(247,214,25,0.6)] active:translate-y-0"
                    >
                      <InstagramGlyph />
                      View on Instagram
                    </a>
                  ) : null}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Controls ── */}
        {total > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-7 sm:px-6">
              <div className="pointer-events-auto flex items-center gap-2.5">
                {posts.map((item, i) => (
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
                ))}
                <span className="ml-2 font-display text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
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
              </div>
            </div>

            {/* Autoplay progress rail. */}
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
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="sr-only">
        {post.title}
      </div>
    </section>
  );
}
