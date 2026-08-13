"use client";

import { useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { BackButton } from "./BackButton";

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
 *
 * ── `home` ────────────────────────────────────────────────────────────────
 *
 * This header is written for the home page and BORROWED by every other route,
 * so it has to know which one it is on. Three things turn on it:
 *
 *   the logo    goes to `/` everywhere else, rather than the top of whatever
 *               page it happens to be sitting on.
 *   the CTA     "Get in Touch" points at the footer, and the footer it means is
 *               the home page's. Off the home page it is hidden rather than
 *               retargeted: a second route to the same contact details, competing
 *               with the one thing a visitor on a circuit or a form page is
 *               actually there to do.
 *   Back        appears only where there is somewhere to go back to.
 *
 * It is a required prop with no default. Every caller states it, because the
 * wrong answer is not a crash — it is a nav bar that quietly does the wrong
 * thing on one route.
 */
export function SiteHeader({
  content,
  home,
  className,
}: {
  content: LandingContent;
  home: boolean;
  className?: string;
}) {
  const { brand, nav } = content;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  const cta = home && nav.cta.label ? nav.cta : null;
  const hasMenu = nav.links.length > 0 || cta !== null;

  /**
   * A dropdown that stays open after the thing behind it was tapped is a
   * dropdown that feels stuck, so it closes on a press outside itself and on
   * Escape. `pointerdown` rather than `click`: it fires before the press turns
   * into a click on whatever is underneath, so the menu is out of the way by the
   * time that lands.
   */
  useEffect(() => {
    if (!open) return;

    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header ref={root} className={cn("absolute inset-x-0 top-0 z-20", className)}>
      {/*
        One row at every width. Below md the links come out of it and into the
        dropdown below — they used to wrap onto a second centred line, which put
        the brand and the links on two different rhythms and left the row looking
        misaligned on a phone.
      */}
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {home ? null : <BackButton />}

          <a
            // The top of this page when this IS the home page; the home page
            // itself from anywhere else.
            href={home ? "#top" : "/"}
            className="flex min-w-0 items-center gap-2.5"
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
              className="h-9 w-auto shrink-0"
            />
            <span className="truncate font-display text-lg font-extrabold tracking-tight text-white">
              {brand.name}
            </span>
          </a>
        </div>

        {nav.links.length > 0 ? (
          <nav className="hidden items-center gap-7 md:flex lg:gap-8">
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

        <div className="flex shrink-0 items-center gap-2">
          {cta ? (
            <a
              href={cta.href}
              className="group hidden shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-sm font-semibold text-accent-ink transition hover:bg-white/90 md:inline-flex"
            >
              <span>{cta.label}</span>
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

          {hasMenu ? (
            <button
              type="button"
              onClick={() => setOpen((was) => !was)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm transition hover:border-white/40 md:hidden"
            >
              {/* Two bars into a cross, drawn rather than swapped for a second
                  icon so the change is one animation and not a flicker. */}
              <span className="relative block h-3 w-4">
                <span
                  className={cn(
                    "absolute inset-x-0 block h-0.5 rounded-full bg-current transition-transform duration-200",
                    open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute inset-x-0 block h-0.5 rounded-full bg-current transition-transform duration-200",
                    open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
                  )}
                />
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {/*
        The dropdown. Solid rather than translucent: it opens over a photograph,
        and a wash dark enough to read white type on ANY banner is dark enough to
        just be a panel. It carries the CTA too, so the phone row stays three
        things wide however much the home page's nav grows.
      */}
      {hasMenu && open ? (
        <div id="site-menu" className="mx-auto max-w-[1560px] px-5 pb-3 sm:px-8 md:hidden">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-2xl">
            <nav className="flex flex-col">
              {nav.links.map((link) => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {cta ? (
              <a
                href={cta.href}
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-accent-ink transition hover:bg-white/90"
              >
                <span>{cta.label}</span>
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
        </div>
      ) : null}
    </header>
  );
}
