"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Poster-first hero background.
 *
 * The academy hero used to render `<video autoPlay>` with the 15 MB clip and a
 * 9.3 MB poster wired straight into the markup. Both started downloading during
 * the initial page load, and because browsers only keep ~6 connections open per
 * host, every other image on the page queued behind them — which is why photos
 * further down the story often never appeared at all.
 *
 * Now the poster is a normal optimized image that paints immediately, and the
 * clip is only fetched once the page has gone idle AND the hero is actually on
 * screen AND the connection looks like it can afford it. Everyone gets a fast,
 * complete page; people on good connections additionally get the motion.
 */
export function HeroBackgroundVideo({
  video,
  poster,
  alt = "",
}: {
  video: string;
  poster: string;
  alt?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Honour reduced-motion: a looping background clip is exactly the kind of
    // thing that setting exists to suppress.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Data Saver, or anything slower than 4g, keeps the poster only.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && !connection.effectiveType.includes("4g")) return;

    let idleHandle: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        // Wait for the main thread to go quiet so the clip never competes with
        // the hero image, fonts or the rest of the story's photography.
        const start = () => setSrc(video);
        idleHandle = window.requestIdleCallback
          ? window.requestIdleCallback(start, { timeout: 3000 })
          : window.setTimeout(start, 1200);
      },
      { rootMargin: "200px" }
    );

    observer.observe(host);

    return () => {
      observer.disconnect();
      if (idleHandle === undefined) return;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
    };
  }, [video]);

  // Autoplay can still be refused (low power mode, platform policy) — falling
  // back to the poster is silent and correct, so failures are swallowed.
  useEffect(() => {
    if (!src) return;
    const element = videoRef.current;
    if (!element) return;
    void element.play().catch(() => undefined);
  }, [src]);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <img
        src={poster}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
      />

      {src ? (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          onCanPlay={() => setReady(true)}
        />
      ) : null}
    </div>
  );
}
