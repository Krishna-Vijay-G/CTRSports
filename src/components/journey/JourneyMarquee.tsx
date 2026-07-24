"use client";

import { TripleChevron } from "./Motifs";

/** Slim top marquee strip — gold band with navy text (deck palette). */
export default function JourneyMarquee({ text }: { text: string }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[65] h-9 flex items-center overflow-hidden bg-gold-gradient"
      aria-label={text}
    >
      <div className="flex whitespace-nowrap animate-marquee">
        {Array.from({ length: 2 }).map((_, i) => (
          <span
            key={i}
            className="flex items-center shrink-0 px-4 font-display font-bold text-[11px] sm:text-xs uppercase tracking-widest text-ctr-navy"
            aria-hidden={i === 1}
          >
            {text}
            <TripleChevron className="mx-5 text-ctr-navy/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
