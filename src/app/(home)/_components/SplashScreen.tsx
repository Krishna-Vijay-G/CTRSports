"use client";

import { useEffect, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";

/**
 * Covers the page while the hero image loads, then fades out and unmounts.
 * Rendered on the server too, so the first paint is the splash rather than a
 * flash of the page underneath it.
 */
export function SplashScreen({ splash }: { splash: LandingContent["splash"] }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const { fade_in_ms: fadeInMs, hide_ms: hideMs } = splash;

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), fadeInMs);
    const hideTimer = window.setTimeout(() => setVisible(false), hideMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
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
        className="w-[min(240px,46vw)] animate-float"
      />
      <p className="font-display text-sm uppercase tracking-[0.3em] text-racing-yellow">
        {splash.title}
      </p>
    </div>
  );
}
