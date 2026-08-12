"use client";

import { useEffect, useRef, useState } from "react";
import type { IncrcContent } from "@/lib/incrcContent";
import type { LandingContent } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { IncrcSections } from "@/app/(site)/incrc/_components/IncrcSections";
import { IncrcTop } from "@/app/(site)/incrc/_components/IncrcTop";

/**
 * The real /incrc page, rendered from the editor's draft, shrunk to fit beside
 * the fields.
 *
 * These are the same components the public route uses — not a mock — including
 * the section renderer, so switching a section off in the editor takes it out of
 * the preview the same way it takes it off the page. The one difference is
 * `PreviewMode`, which stops scroll-triggered reveals sitting invisible in a
 * pane that never scrolls past the window, and stops the banners rotating while
 * one is open in the editor.
 *
 * `focus` scrolls the pane to whichever section is being edited; `bannerIndex`
 * holds the carousel on one banner while it is being edited.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function IncrcPreview({
  content,
  chrome,
  year,
  focus,
  bannerIndex,
  className,
}: {
  content: IncrcContent;
  chrome: LandingContent;
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
    if (!pane) return;

    // No focus means the top — the banners, which is what the layout, identity
    // and banner tabs are all about.
    if (!focus) {
      pane.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = pane.querySelector(`[data-preview="${focus}"]`);
    // A section that is switched off is not in the pane at all, which is the
    // right thing to see: nothing moves, and the editor still opens.
    if (!target) return;

    // Measured rather than scrollIntoView, which would also scroll the admin's
    // own columns to bring the pane into view. Both rectangles are in the same
    // (post-zoom) coordinates, so the difference is the distance to travel.
    const top =
      target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
    pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [focus, content.sections]);

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
              <IncrcTop
                banners={content.banners}
                chrome={chrome}
                activeIndex={bannerIndex}
              />
              <IncrcSections content={content} />
              <SiteFooter content={chrome} year={year} />
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
