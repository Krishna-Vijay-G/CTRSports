"use client";

import { useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";
import type { Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BannerCarousel } from "@/app/(site)/_components/banner/BannerCarousel";
import { AboutSection } from "@/app/(site)/_components/sections/AboutSection";
import { CtaBand } from "@/app/(site)/_components/sections/CtaBand";
import { SportsSection } from "@/app/(site)/_components/sections/SportsSection";

/**
 * The real landing page, rendered from the editor's draft, shrunk to fit beside
 * the fields.
 *
 * These are the same components the public route uses — not a mock — so the
 * preview cannot drift from the site. The one difference is `PreviewMode`, which
 * stops scroll-triggered reveals from sitting invisible in a pane that never
 * scrolls past the window, and stops the banners rotating while one is open in
 * the editor.
 *
 * The splash screen is left out on purpose: it is `position: fixed`, so it would
 * cover the admin rather than the preview.
 *
 * `focus` scrolls the pane to whichever part of the page is being edited;
 * `bannerIndex` holds the carousel on one banner while it is being edited.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function LandingPreview({
  content,
  sports,
  year,
  focus,
  bannerIndex,
  className,
}: {
  content: LandingContent;
  sports: Sport[];
  year: number;
  focus?: string;
  bannerIndex?: number;
  className?: string;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = paneRef.current;
    if (!element) return;

    // clientWidth, so the scrollbar is not counted as page width.
    // A zero width is a measurement taken before layout, or while the pane is
    // folded away — not a real size. Scaling by it would set `zoom: 0` and
    // collapse the whole preview to an empty black box, so the last good scale
    // is kept until a real width arrives.
    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setScale(width / PREVIEW_WIDTH);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !focus) return;

    const target = pane.querySelector(`[data-preview="${focus}"]`);
    if (!target) return;

    // Measured rather than scrollIntoView, which would also scroll the admin's
    // own columns to bring the pane into view. Both rectangles are in the same
    // (post-zoom) coordinates, so the difference is the distance to travel.
    const top =
      target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
    pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [focus]);

  // Only what is visible is previewed — hidden cards are not on the page.
  const visible = sports.filter((sport) => sport.is_visible);

  return (
    <div
      ref={paneRef}
      className={cn("overflow-y-auto rounded-lg border border-border bg-black", className)}
    >
      {/*
        `zoom` rather than `transform: scale()`. Zoom reflows, so the surrounding
        box gets the right height on its own; a transform would leave the
        original full-size gap behind and need the height measured and applied by
        hand. Media queries still key off the real window, which is what we want —
        this is a desktop preview.
      */}
      <div style={{ zoom: scale }} className="origin-top-left">
        <PreviewMode>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              {/* The wrappers are what `focus` scrolls to. */}
              <div data-preview="banners">
                <BannerCarousel
                  banners={content.banners}
                  header={<SiteHeader content={content} home />}
                  activeIndex={bannerIndex}
                />
              </div>
              <div data-preview="about">
                <AboutSection about={content.about} />
              </div>
              <div data-preview="sports">
                <SportsSection heading={content.sportsSection} sports={visible} />
              </div>
              <div data-preview="cta">
                <CtaBand band={content.ctaBand} sports={visible} />
              </div>
              <div data-preview="footer">
                <SiteFooter content={content} year={year} />
              </div>
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
