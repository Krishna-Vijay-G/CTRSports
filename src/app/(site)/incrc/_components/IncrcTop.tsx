"use client";

import type { Banner } from "@/lib/banners";
import type { LandingContent } from "@/lib/landingContent";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BannerCarousel } from "@/app/(site)/_components/banner/BannerCarousel";

/**
 * The top of /incrc: the navigation, and the banners it is laid over.
 *
 * The banners are the one part of this page that is NOT in the running order.
 * They carry the header, so they are always first — and emptying the banner list
 * in the admin is what removes the carousel. When it is empty the header falls
 * back to a solid bar in the flow, so the page can never come up with no way to
 * navigate away from it.
 *
 * The header's own content is the LANDING document, on purpose: the chrome
 * around this page should stay in step with the home page when either is edited.
 */
export function IncrcTop({
  banners,
  chrome,
  activeIndex,
}: {
  banners: Banner[];
  chrome: LandingContent;
  activeIndex?: number;
}) {
  if (banners.length === 0) {
    return (
      <SiteHeader
        content={chrome}
        home={false}
        className="relative z-20 border-b border-line bg-surface"
      />
    );
  }

  return (
    <BannerCarousel
      banners={banners}
      header={<SiteHeader content={chrome} home={false} />}
      activeIndex={activeIndex}
    />
  );
}
