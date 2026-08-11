"use client";

import { useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";
import type { Sport } from "@/lib/sports";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AboutSection } from "@/app/(site)/_components/AboutSection";
import { CtaBand } from "@/app/(site)/_components/CtaBand";
import { Hero } from "@/app/(site)/_components/Hero";
import { SportsSection } from "@/app/(site)/_components/SportsSection";

/**
 * The real landing page, rendered from the editor's draft, shrunk to fit beside
 * the form.
 *
 * These are the same components the public route uses — not a mock — so the
 * preview cannot drift from the site. The one difference is `PreviewMode`,
 * which stops scroll-triggered reveals from sitting invisible in a pane that
 * never scrolls past the window.
 *
 * The splash screen is left out on purpose: it is `position: fixed`, so it would
 * cover the admin rather than the preview.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function LandingPreview({
  content,
  sports,
  year,
}: {
  content: LandingContent;
  sports: Sport[];
  year: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () => setScale(element.clientWidth / PREVIEW_WIDTH);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Only what is visible is previewed — hidden cards are not on the page.
  const visible = sports.filter((sport) => sport.is_visible);

  return (
    <div ref={frameRef} className="w-full">
      {/*
        `zoom` rather than `transform: scale()`. Zoom reflows, so the surrounding
        box gets the right height on its own; a transform would leave the
        original full-size gap behind and need the height measured and applied
        by hand. Media queries still key off the real window, which is what we
        want — this is a desktop preview.
      */}
      <div style={{ zoom: scale }} className="origin-top-left">
        <PreviewMode>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              <Hero content={content} sports={visible} />
              <AboutSection about={content.about} />
              <SportsSection heading={content.sportsSection} sports={visible} />
              <CtaBand band={content.ctaBand} sports={visible} />
              <SiteFooter content={content} year={year} />
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
