"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";
import type { SectionViewProps } from "@/lib/sections/types";
import { BannerCarousel } from "./BannerCarousel";
import type { Banners } from "./model";

/**
 * The rotating panels at the top, with the navigation laid over them.
 *
 * ── Why this section draws the header ─────────────────────────────────────
 *
 * The header is not part of the page's content — it is the site's chrome, drawn
 * around every route. But on a page that opens with banners it is laid OVER the
 * photograph rather than sitting above it, and with no banners it has to fall
 * back to a solid bar in the flow so the page never comes up with no way to
 * navigate away from it.
 *
 * That choice belongs to the banners rather than to the route: the route would
 * have to know which kind of section happens to be first. So the module declares
 * `carriesHeader`, the renderer hands the header to the first section when it
 * does, and this is the only section that takes it.
 *
 * The header arrives already built, which is also what lets the console preview
 * draw the real page: it is a rendered node, not a document this section would
 * have to fetch.
 */
export function BannersView({ value, header }: SectionViewProps<Banners>) {
  if (value.items.length === 0) {
    /*
     * No banners is not "no header". Emptying the list is how the carousel is
     * removed, and what is left is the same navigation on a solid bar.
     *
     * `header` is undefined when this is not the first section — somebody has
     * put a ticker above the banners — and then the bar has already been drawn
     * further up the page and there is nothing to do here.
     */
    return header ? (
      <div className="relative z-20 border-b border-line bg-surface">{header}</div>
    ) : null;
  }

  return <BannerCarousel banners={value.items} header={header ?? null} />;
}
