"use client";

import { useEffect, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";

/**
 * Covers the page while the hero photo loads, then fades out and unmounts.
 *
 * The configured duration is an upper bound, not a timer: the splash leaves as
 * soon as `load` fires, with a short floor so it does not flicker into nothing
 * on a warm cache. A splash that always sits for a flat two seconds is the
 * single easiest way to make a fast site feel slow.
 */

/** Below this it reads as a flash rather than an intro. */
const MIN_VISIBLE_MS = 350;
/** Hard cap, so a stalled asset can never strand a visitor here. */
const MAX_VISIBLE_MS = 1800;
const FADE_MS = 500;

export function SplashScreen({ splash }: { splash: LandingContent["splash"] }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    let fadeTimer: number | undefined;
    let hideTimer: number | undefined;

    const dismiss = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      fadeTimer = window.setTimeout(() => setFading(true), wait);
      hideTimer = window.setTimeout(() => setVisible(false), wait + FADE_MS);
    };

    // `load` waits for the hero photo and the stylesheet, which is exactly the
    // moment the page behind this is worth revealing.
    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    // Hard cap, so one stalled asset can never strand a visitor on the splash.
    const cap = window.setTimeout(dismiss, MAX_VISIBLE_MS);

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(cap);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label={`Loading ${splash.title}`}
      className={`fixed inset-0 z-[999] grid place-content-center justify-items-center gap-4 bg-page transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={splash.logo}
        alt={`${splash.title} logo`}
        fetchPriority="high"
        decoding="async"
        className="w-[min(190px,42vw)] animate-float"
      />
      <p className="font-display text-sm font-bold tracking-[0.24em] text-fg-faint">
        {splash.title.toUpperCase()}
      </p>
    </div>
  );
}
