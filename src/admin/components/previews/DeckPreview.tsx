"use client";

import { useEffect, useRef, useState } from "react";
import type { Deck } from "@/lib/decks";
import type { Chrome } from "@/lib/chrome";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DeckPages } from "@/app/(site)/_shell/deck/DeckPages";

/**
 * The real deck page, rendered from the editor's draft, shrunk to fit beside
 * the fields.
 *
 * The same component the public route draws — not a mock — which on this screen
 * is the entire point: reordering fifty images is a job you do by looking at
 * them, and a list of file names in the fields column tells you nothing about
 * whether page 12 now follows page 11.
 *
 * `PreviewMode` stops the scroll-triggered reveals sitting invisible in a pane
 * that never scrolls past the window.
 */

/** The viewport width the preview pretends to be. */
const PREVIEW_WIDTH = 1440;

export function DeckPreview({
  deck,
  chrome,
  year,
  className,
}: {
  /** The draft being edited, or null when no deck is open. */
  deck: Deck | null;
  chrome: Chrome;
  year: number;
  className?: string;
}) {
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

  // Back to the top when the pane switches deck — a short deck opened while
  // scrolled halfway down a long one would otherwise start below its own end.
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [deck?.id]);

  return (
    <div
      ref={paneRef}
      className={cn("overflow-y-auto rounded-lg border border-border bg-black", className)}
    >
      {/*
        `zoom` rather than `transform: scale()`. Zoom reflows, so the surrounding
        box gets the right height on its own; a transform would leave the
        original full-size gap behind and need the height measured by hand.

        pointer-events-none for the reason the circuits preview gives: the
        header and footer in here are real links, and a stray click would
        navigate the ADMIN to the public site with an unsaved deck open.
      */}
      <div style={{ zoom: scale }} className="pointer-events-none origin-top-left">
        <PreviewMode>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              <SiteHeader
                content={chrome}
                home={false}
                className="relative z-20 border-b border-line bg-surface"
              />

              <section className="shell py-14">
                {deck && deck.show_heading && (deck.name || deck.blurb) ? (
                  <div className="mx-auto mb-10 max-w-4xl">
                    {deck.name ? (
                      <h1 className="headline text-[clamp(1.6rem,3.6vw,2.6rem)]">{deck.name}</h1>
                    ) : null}
                    {deck.blurb ? <p className="body-copy mt-3">{deck.blurb}</p> : null}
                  </div>
                ) : null}

                {deck && deck.pages.length > 0 ? (
                  <DeckPages deck={deck} />
                ) : (
                  <div className="panel-card mx-auto max-w-2xl p-10 text-center">
                    <p className="body-copy">
                      {deck
                        ? "Nothing in this deck yet — add the first page."
                        : "No deck open."}
                    </p>
                  </div>
                )}
              </section>

              <SiteFooter content={chrome} year={year} />
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
