"use client";

import { useEffect, useRef, useState } from "react";
import type { EventSummary } from "@/lib/events";
import type { Chrome } from "@/lib/chrome";
import type { Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useSite } from "@/admin/components/SiteScope";
import { CircuitDetail } from "@/app/(site)/_shell/circuits/CircuitDetail";
import { CircuitIndex } from "@/app/(site)/_shell/circuits/CircuitIndex";

/**
 * The real circuits pages, rendered from the editor's draft, shrunk to fit
 * beside the fields.
 *
 * The same components the public route uses — not a mock — so a path pasted into
 * the outline field is drawn here exactly as the site will draw it, at the size
 * the site draws it. That is the whole reason this pane exists: an SVG path is
 * the one field on the screen whose value is unreadable as text, so it cannot be
 * checked any other way.
 *
 * Which page it shows follows the list: open a circuit and this is that
 * circuit's page, close it and this is the index. There is no separate control
 * for it, because there is no case where you want to look at one while editing
 * the other.
 *
 * `PreviewMode` stops the scroll-triggered reveals sitting invisible in a pane
 * that never scrolls past the window.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function CircuitPreview({
  tracks,
  track,
  chrome,
  season,
  year,
  className,
}: {
  /** The whole draft list, in the order the editor shows it. */
  tracks: Track[];
  /** The one being edited, or null for the index page. */
  track: Track | null;
  chrome: Chrome;
  season: readonly EventSummary[];
  year: number;
  className?: string;
}) {
  /* The sport whose circuits these are — every link the preview draws is under
     it, and the preview draws the real components. */
  const site = useSite();

  const paneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = paneRef.current;
    if (!element) return;

    // clientWidth, so the scrollbar is not counted as page width. A zero width
    // is a measurement taken before layout, or while the pane is folded away —
    // scaling by it would set `zoom: 0` and collapse the preview to an empty
    // box, so the last good scale is kept until a real width arrives.
    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setScale(width / PREVIEW_WIDTH);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Back to the top when the pane switches page — a detail page opened while
  // scrolled halfway down the index would otherwise start in its middle.
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [track?.id]);

  return (
    <div
      ref={paneRef}
      className={cn("overflow-y-auto rounded-lg border border-border bg-black", className)}
    >
      {/*
        `zoom` rather than `transform: scale()`. Zoom reflows, so the surrounding
        box gets the right height on its own; a transform would leave the
        original full-size gap behind and need the height measured by hand.
      */}
      {/*
        pointer-events-none, unlike the page previews: this one is a wall of
        links — every card, every neighbour, the whole header — and a stray click
        would navigate the ADMIN to the public route and take any unsaved row
        with it. Scrolling still works, because a wheel event over an
        unclickable child is delivered to the pane underneath it.
      */}
      <div style={{ zoom: scale }} className="pointer-events-none origin-top-left">
        <PreviewMode>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              {track ? (
                <>
                  <SiteHeader
                    content={chrome}
                    home={false}
                    className="relative z-20 border-b border-line bg-surface"
                  />
                  <CircuitDetail site={site} track={track} tracks={tracks} season={season} />
                </>
              ) : (
                <>
                  <SiteHeader
                    content={chrome}
                    home={false}
                    className="relative z-20 border-b border-line bg-surface"
                  />
                  <CircuitIndex site={site} tracks={tracks} />
                </>
              )}

              <SiteFooter content={chrome} year={year} />
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
