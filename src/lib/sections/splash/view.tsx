"use client";

import { useEffect, useState } from "react";
import type { Splash } from "./model";
import { Media } from "@/components/ui/Media";

/**
 * Covers the page while the first banner photo loads, then fades out and unmounts.
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

export function SplashScreen({ splash }: { splash: Splash }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  // Nothing to show is no splash. This covers the whole viewport for up to
  // 1.8 seconds, so with neither a mark nor a name it is a blank page held over
  // the real one — and the <img> would be an empty `src`, which the browser
  // resolves against the page and re-requests before drawing a broken mark.
  const shown = Boolean(splash.logo || splash.title);

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

    // `load` waits for the banner photo and the stylesheet, which is exactly the
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

  // After the effect, never before it: the hooks above run on every render or
  // none, and an early return between them is the one way to break that.
  if (!shown || !visible) return null;

  return (
    <div
      aria-label={splash.title ? `Loading ${splash.title}` : "Loading"}
      className={`fixed inset-0 z-[999] grid place-content-center justify-items-center gap-4 bg-page transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {splash.logo ? (
        <Media
          src={splash.logo}
          alt={splash.title ? `${splash.title} logo` : ""}
          fetchPriority="high"
          decoding="async"
          className="w-[min(190px,42vw)] animate-float"
        />
      ) : null}
      {splash.title ? (
        <p className="font-display text-sm font-bold tracking-[0.24em] text-fg-faint">
          {splash.title.toUpperCase()}
        </p>
      ) : null}
    </div>
  );
}
