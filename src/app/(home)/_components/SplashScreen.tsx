"use client";

import { useEffect, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";

/**
 * Covers the page while the hero image loads, then fades out and unmounts.
 * Rendered on the server too, so the first paint is the splash rather than a
 * flash of the page underneath it.
 *
 * It used to sit on a fixed pair of timers, so the landing page was hidden for
 * a flat 2 s no matter how fast it was actually ready — the single biggest
 * contributor to the site feeling slow. Now the configured durations act as an
 * upper bound: the splash leaves as soon as the page has finished loading, with
 * a short floor so it does not flicker on a warm cache.
 */

/** Below this the splash reads as a flash rather than an intro. */
const MIN_VISIBLE_MS = 350;

export function SplashScreen({ splash }: { splash: LandingContent["splash"] }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const { fade_in_ms: fadeInMs, hide_ms: hideMs } = splash;

  useEffect(() => {
    const startedAt = performance.now();
    let fadeTimer: number | undefined;
    let hideTimer: number | undefined;

    const dismiss = () => {
      // Never leave instantly — honour the floor, and never outstay the
      // configured cap even if `load` is slow to fire.
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, Math.min(MIN_VISIBLE_MS - elapsed, fadeInMs));

      fadeTimer = window.setTimeout(() => setFading(true), wait);
      hideTimer = window.setTimeout(() => setVisible(false), wait + 500);
    };

    // `load` waits for the hero image and stylesheets, which is exactly the
    // moment the page behind is worth revealing.
    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    // Hard cap: a stalled asset must never strand the visitor on the splash.
    const cap = window.setTimeout(dismiss, Math.max(hideMs, MIN_VISIBLE_MS));

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(cap);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [fadeInMs, hideMs]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] grid place-content-center justify-items-center gap-3 bg-carbon-950 transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: "radial-gradient(circle at center, #191919 0%, #060606 62%)" }}
      aria-label={splash.aria_label}
    >
      <img
        src={splash.logo_image}
        alt="CTR Unified logo"
        fetchPriority="high"
        decoding="async"
        className="w-[min(240px,46vw)] animate-float"
      />
      <p className="font-display text-sm uppercase tracking-[0.3em] text-racing-yellow">
        {splash.title}
      </p>
    </div>
  );
}
