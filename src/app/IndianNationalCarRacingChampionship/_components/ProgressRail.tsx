"use client";

import { useEffect, useState } from "react";
import type { Chapter } from "../_data/biography";
import { cn } from "@/lib/utils";

/**
 * Sticky vertical rail on the right edge (desktop): one dot per chapter,
 * the active dot fills gold, labels appear on hover, click smooth-scrolls.
 */
export function ProgressRail({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(chapters[0]?.id);

  useEffect(() => {
    const sections = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav
      aria-label="Chapter navigation"
      className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-3"
    >
      {chapters.map((c) => {
        const isActive = active === c.id;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="group flex items-center gap-3"
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-wider text-ctr-navy bg-white/95 shadow-card border border-ctr-navy/10 transition-all duration-300 whitespace-nowrap",
                "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus:opacity-100"
              )}
            >
              <span className="text-ctr-gold-deep">{c.number}</span>
              {c.title}
            </span>
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span
                className={cn(
                  "block rounded-full transition-all duration-300",
                  isActive
                    ? "h-3 w-3 bg-gold-gradient shadow-[0_0_0_4px_rgba(244,180,0,0.2)]"
                    : "h-2 w-2 bg-ctr-navy/25 group-hover:bg-ctr-navy/50"
                )}
              />
            </span>
          </a>
        );
      })}
    </nav>
  );
}
