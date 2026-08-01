"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 7000;

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
  const total = posts.length;
  const liveRegion = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (total < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [total, paused]);

  if (total === 0) return null;

  const post = posts[index];

  return (
    <section
      id="latest"
      aria-labelledby="latest-heading"
      className="relative border-y border-white/5 bg-gradient-to-b from-carbon-900 to-carbon-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-6 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
              Latest from CTR
            </p>
            <h2
              id="latest-heading"
              className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl"
            >
              Newsroom
            </h2>
          </div>

          {total > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous post"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
              >
                <Arrow direction="prev" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next post"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
              >
                <Arrow direction="next" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.9)]">
          <AnimatePresence mode="wait">
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="grid items-stretch gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
            >
              {/* Left — title at the top, subtext beneath it. */}
              <div className="order-2 flex flex-col justify-start gap-4 p-6 sm:p-9 md:order-1 md:p-10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-racing-yellow/15 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-racing-yellow">
                    {formatPostDate(post.published_at)}
                  </span>
                  <span className="font-display text-[11px] uppercase tracking-[0.2em] text-white/35">
                    {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-bold uppercase leading-[1.05] tracking-wide text-white sm:text-3xl lg:text-4xl">
                  {post.title}
                </h3>

                {post.subtext ? (
                  <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-white/65 sm:text-base">
                    {post.subtext}
                  </p>
                ) : null}

                {post.instagram_url ? (
                  <a
                    href={post.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-racing-yellow px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)]"
                  >
                    <InstagramGlyph />
                    View on Instagram
                  </a>
                ) : null}
              </div>

              {/* Right — the full image, never cropped. */}
              <div className="order-1 flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-transparent p-4 sm:p-6 md:order-2">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="max-h-[220px] w-full rounded-2xl object-contain sm:max-h-[320px] md:max-h-[420px]"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {total > 1 ? (
          <div className="mt-5 flex items-center justify-center gap-2">
            {posts.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show post ${i + 1}: ${item.title}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-racing-yellow" : "w-3 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        ) : null}

        <div ref={liveRegion} aria-live="polite" className="sr-only">
          {post.title}
        </div>
      </div>
    </section>
  );
}
