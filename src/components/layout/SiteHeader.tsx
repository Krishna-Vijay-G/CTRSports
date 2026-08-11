"use client";

import type { LandingContent } from "@/lib/landingContent";
import { cn } from "@/lib/utils";

/**
 * The nav bar. It is laid over the banners rather than pinned to the
 * viewport, so it is transparent and its type is white — there is always a dark
 * photo behind it.
 *
 * Not sticky, by design: the page lives inside a rounded, clipped card, and a
 * sticky child cannot escape that clipping. The reference design does the same.
 *
 * `className` replaces the positioning, for the one case that has no banner
 * underneath it: /incrc with its carousel emptied, where the header becomes a
 * solid bar in the flow instead of an overlay.
 */
export function SiteHeader({
  content,
  className,
}: {
  content: LandingContent;
  className?: string;
}) {
  const { brand, nav } = content;

  return (
    <header className={cn("absolute inset-x-0 top-0 z-20", className)}>
      {/*
        One row from md: up (brand · nav · button). Below that it wraps to two:
        brand and button on the first, the links centred underneath. Ordering
        does the wrapping, so there is only ever one <nav> in the markup — a
        second, hidden copy would be read out twice by a screen reader.
      */}
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 sm:px-8">
        <a
          href="#top"
          className="order-1 flex items-center gap-2.5"
          aria-label={`${brand.name} home`}
        >
          <img
            src={brand.logo}
            alt=""
            aria-hidden
            width={40}
            height={40}
            fetchPriority="high"
            decoding="async"
            className="h-9 w-auto"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            {brand.name}
          </span>
        </a>

        {nav.links.length > 0 ? (
          <nav className="order-3 flex w-full items-center justify-center gap-7 md:order-2 md:w-auto md:gap-8">
            {nav.links.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="text-sm font-medium text-white/75 transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        {nav.cta.label ? (
          <a
            href={nav.cta.href}
            className="group order-2 inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-sm font-semibold text-accent-ink transition hover:bg-white/90 md:order-3"
          >
            <span className="hidden sm:inline">{nav.cta.label}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M3 7h8M7.5 3.5 11 7l-3.5 3.5"
                  stroke="#0A0A0A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        ) : null}
      </div>
    </header>
  );
}
