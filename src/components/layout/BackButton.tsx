"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * "Back", in the header of every page that is not the home page.
 *
 * It is a real link to `/` that USUALLY does something else. That order matters:
 * rendered as an anchor it has a destination before any JavaScript runs, it can
 * be opened in a new tab, and a crawler sees a route rather than a dead button.
 * The click handler then upgrades it to `router.back()`, which is what "back"
 * actually means to a visitor — the page they came from, not a fixed one.
 *
 * The upgrade is skipped when there is nothing to go back TO. Someone who opened
 * /incrc straight from a search result has one entry in their history, and
 * `history.back()` there either does nothing at all or throws them off the site
 * entirely; the plain link to the home page is the better answer. `history.length`
 * is the only signal a page gets about this — `document.referrer` is set once when
 * the document loads and does not move with client-side navigation, so it says
 * nothing about where the visitor was a moment ago.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <a
      href="/"
      aria-label="Go back"
      onClick={(event) => {
        // A modified click is the visitor asking the BROWSER for something —
        // a new tab, a new window. Never intercept those.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (typeof window === "undefined" || window.history.length <= 1) return;

        event.preventDefault();
        router.back();
      }}
      className={cn(
        // A flat scrim rather than a blurred one: the blur was the last of it in
        // this header, it is an expensive paint for an effect nobody asked for,
        // and a slightly darker wash does the same job of keeping white type
        // readable over whichever photograph is behind it.
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-3 py-1.5",
        "text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white",
        className
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M11 7H3M6.5 3.5 3 7l3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Back</span>
    </a>
  );
}
