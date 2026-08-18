"use client";

import type { Chrome } from "@/lib/chrome";
import { cn } from "@/lib/utils";
import { BackButton } from "./BackButton";
import { Media } from "@/components/ui/Media";

/**
 * The nav bar. It is laid over the banners rather than pinned to the
 * viewport, so it is transparent and its type is white.
 *
 * ── "There is always a dark photo behind it" ──────────────────────────────
 *
 * That is what this comment used to say, and it stopped being true. A banner
 * carries its own wash — `Scrim` in the banner templates — and that wash can
 * be set to `light` or to `none`; a banner can also be a poster, a fixture
 * list or an invitation on a pale background, which is exactly what gets
 * uploaded in practice. White type at 75% over one of those is not low
 * contrast, it is invisible.
 *
 * So the bar now brings its own contrast rather than borrowing it from
 * whatever happens to be underneath: a wash of its own, and a shadow under the
 * type for the busy middle ground where a wash alone is not enough. Both are
 * confined to the overlaid case — see `overlaid` below.
 *
 * Not sticky, by design: the page lives inside a rounded, clipped card, and a
 * sticky child cannot escape that clipping. The reference design does the same.
 *
 * `className` replaces the positioning, for the one case that has no banner
 * underneath it: /incrc with its carousel emptied, where the header becomes a
 * solid bar in the flow instead of an overlay.
 *
 * ── On a phone, everything is in a row ────────────────────────────────────
 *
 * There was a hamburger here that opened a panel down over the page. It is gone,
 * and so is the state, the blurred button, the outside-click and Escape
 * handling, and the width-dependent shuffling of which things lived in the row
 * and which lived in the panel.
 *
 * What replaced it: the brand and the call to action stay in the top row at
 * every width, and the links run left to right underneath, scrolling sideways
 * when there are more than fit. That behaves the same at 320px as at 500px —
 * nothing is hidden behind a tap, nothing rearranges itself at a breakpoint, and
 * a link that will not fit is one swipe away rather than two taps. It is the
 * same pattern the admin sidebar uses below `md`, for the same reason.
 *
 * There are no links on this site's footer navigation today; the row appears the
 * moment there are some, so adding them is an edit in the admin.
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
  content: Chrome;
  home: boolean;
  className?: string;
}) {
  const { brand, nav } = content;

  const cta = home && nav.cta.label ? nav.cta : null;

  /*
   * Whether this bar is floating over a picture or standing on a background of
   * its own.
   *
   * Read off `className`, which is not a coincidence: that prop exists for
   * exactly one purpose, stated at the top of this file — it replaces the
   * positioning for the case with no banner underneath, and every caller that
   * passes it passes the same `relative … bg-surface`. So its presence already
   * means "this bar has its own background", and a second prop saying the same
   * thing would be a second thing to keep in step.
   *
   * The wash and the text shadow would both be wasted there anyway: `bg-surface`
   * is near-black, white type on it is already at full contrast, and a gradient
   * over it would read as a smudge along the top of a solid bar.
   */
  const overlaid = !className;

  /*
   * The shadow under the type.
   *
   * A wash gets white type off a mid-tone photograph. What it cannot do is
   * rescue it from a pale one — a wash strong enough for that would black out
   * the picture it is there to sit on. A shadow costs nothing, darkens only the
   * few pixels around each letter, and is what holds an edge against a bright
   * or a busy background.
   */
  const legible = overlaid && "[text-shadow:0_1px_3px_rgb(0_0_0/0.55)]";

  return (
    <header className={cn("absolute inset-x-0 top-0 z-20", className)}>
      {/*
        The bar's own wash: dark at the top where the type is, gone by the
        bottom so it reads as the edge of the picture rather than as a band
        across it. `inset-0` covers the phone's second row of links too.

        Absolutely positioned, so everything after it needs `relative` to stay
        above it — an absolute sibling paints over static ones.
      */}
      {overlaid ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-transparent"
        />
      ) : null}

      <div className="relative mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-5 py-5 sm:gap-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {home ? null : <BackButton />}

          {/* Neither a mark nor a name is no link. It would be a zero-width
              anchor — invisible, but a tab stop, and one announcing itself as
              " home". Nothing to click is better than something that cannot be
              seen but can be reached. */}
          {brand.logo || brand.name ? (
            <a
              // The top of this page when this IS the home page; the home page
              // itself from anywhere else.
              href={home ? "#top" : "/"}
              className="flex min-w-0 items-center gap-2.5"
              aria-label={brand.name ? `${brand.name} home` : "Home"}
            >
              {/* No logo is no <img>. An empty `src` is not an absent picture:
                  the browser resolves "" against the page, re-requests the page
                  itself, and then draws the 40×40 box the attributes reserved —
                  a white square where a mark should be. */}
              {brand.logo ? (
                <Media
                  src={brand.logo}
                  alt=""
                  aria-hidden
                  width={40}
                  height={40}
                  fetchPriority="high"
                  decoding="async"
                  className="h-9 w-auto shrink-0"
                />
              ) : null}
              {brand.name ? (
                <span
                  className={cn(
                    "truncate font-display text-base font-extrabold tracking-tight text-white sm:text-lg",
                    legible
                  )}
                >
                  {brand.name}
                </span>
              ) : null}
            </a>
          ) : null}
        </div>

        {/* From md the links sit in this row, where there is room for them. */}
        {nav.links.length > 0 ? (
          <nav aria-label="Site" className="hidden items-center gap-7 md:flex lg:gap-8">
            {nav.links.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                className={cn(
                  // Was `text-white/75`. A quarter of the contrast given away
                  // for a hover state that has the wash to work against now.
                  "text-sm font-medium text-white/90 transition hover:text-white",
                  legible
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        {/*
          In the row at every width now, rather than folded into a menu below
          md. It is the one thing on the page a visitor is being asked to do, and
          it was the only thing the phone's menu button existed to hide.
          The arrow's disc is dropped on the narrowest screens so the pill stays
          short enough to leave the brand its width.
        */}
        {cta ? (
          <a
            href={cta.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-4 text-[13px] font-semibold text-accent-ink transition hover:bg-white/90 sm:pl-5 sm:pr-1.5 sm:text-sm"
          >
            <span className="whitespace-nowrap">{cta.label}</span>
            <span className="hidden h-7 w-7 items-center justify-center rounded-full bg-accent sm:flex">
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

      {/*
        The same links below md, as one row that runs left to right and scrolls
        sideways if it has to. `rail-scroll` hides the bar — see globals.css.
        `-mt-1 pb-4` keeps the two rows reading as one bar rather than two.
      */}
      {nav.links.length > 0 ? (
        <nav
          aria-label="Site"
          className="rail-scroll relative mx-auto -mt-1 flex max-w-[1560px] items-center gap-6 overflow-x-auto px-5 pb-4 sm:px-8 md:hidden"
        >
          {nav.links.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              className={cn(
                "shrink-0 whitespace-nowrap text-sm font-medium text-white/90 transition hover:text-white",
                legible
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
