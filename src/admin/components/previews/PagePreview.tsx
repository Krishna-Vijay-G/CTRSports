"use client";

import { useEffect, useRef, useState } from "react";
import type { Chrome } from "@/lib/chrome";
import type { Section } from "@/lib/sections/document";
import { PageSections } from "@/lib/sections/render";
import type { SectionRecords } from "@/lib/sections/types";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * The real page, rendered from the editor's draft, shrunk to fit beside the
 * fields.
 *
 * These are the same components the public route uses — not a mock — including
 * the section renderer, so switching a section off in the editor takes it out of
 * the preview exactly the way it takes it off the page. The one difference is
 * `PreviewMode`, which stops scroll-triggered reveals sitting invisible in a
 * pane that never scrolls past the window, and holds the banner carousel on
 * whichever banner is open in the editor.
 *
 * One preview for every page there will ever be. There used to be two — one per
 * content type — and the second existed only because the landing page was not
 * made of sections.
 *
 * `focus` is a section's ID rather than its kind, because a page may carry two
 * of a kind and the pane has to scroll to the one being edited. The header and
 * the footer are the two exceptions: they are drawn here rather than by a
 * section, so they carry the fixed landmarks `"head"` and `"foot"` and a chrome
 * section names one of those instead — see `previewAt` on the module.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function PagePreview({
  sections,
  chrome,
  records,
  year,
  focus,
  bannerIndex,
  className,
}: {
  sections: readonly Section[];
  /** The header and footer, read-only here: they are edited on the root site. */
  chrome: Chrome;
  /** The records the sections draw. Passed in, not fetched: this is a client component. */
  records: SectionRecords;
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

    // No focus means the top — which is where the identity section and the
    // chrome sections all point, none of them being anywhere on the page.
    if (!focus) {
      pane.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = pane.querySelector(`[data-preview="${focus}"]`);
    // A section that is switched off is not in the pane at all, which is the
    // right thing to see: nothing moves, and the editor still opens.
    if (!target) return;

    // Measured rather than scrollIntoView, which would also scroll the console's
    // own columns to bring the pane into view. Both rectangles are in the same
    // (post-zoom) coordinates, so the difference is the distance to travel.
    const top =
      target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
    pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [focus, sections]);

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
        <PreviewMode bannerIndex={bannerIndex}>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              <PageSections
                sections={sections}
                records={records}
                header={
                  <div data-preview="head">
                    <SiteHeader content={chrome} home={false} />
                  </div>
                }
              />
              {/* Wrapped only so the pane has something to scroll to when the
                  footer's own fields are open. See `previewAt`. */}
              <div data-preview="foot">
                <SiteFooter content={chrome} year={year} />
              </div>
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
