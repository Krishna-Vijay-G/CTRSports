import type { LandingContent } from "@/lib/landingContent";
import type { MarqueeItem } from "@/lib/marquee";
import { AnnouncementMarquee } from "@/components/ui/AnnouncementMarquee";
import { SmartImage } from "@/components/ui/SmartImage";

const anchorClass =
  "font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow";

/** Sticky brand bar. Each anchor only appears when it has a section to jump to. */
export function LandingHeader({
  brand,
  hasPosts,
  hasSports,
  marquee,
}: {
  brand: LandingContent["brand"];
  hasPosts: boolean;
  hasSports: boolean;
  marquee: MarqueeItem[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-carbon-950/70 backdrop-blur-md">
      <AnnouncementMarquee items={marquee} />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
        <a href="#top" className="flex items-center gap-3" aria-label={brand.home_aria_label}>
          <SmartImage
            src={brand.logo_image}
            alt="CTR Unified logo"
            width={128}
            height={72}
            priority
            sizes="(min-width: 640px) 48px, 40px"
            className="h-10 w-auto sm:h-12"
          />
          <span className="flex flex-col leading-none">
            <strong className="font-display text-sm font-semibold tracking-[0.14em] text-racing-yellow sm:text-base">
              {brand.name}
            </strong>
            <span className="mt-1 text-[10px] tracking-[0.22em] text-white/45 sm:text-xs">
              {brand.subtitle}
            </span>
          </span>
        </a>

        {hasPosts || hasSports ? (
          <nav className="flex items-center gap-5">
            {hasPosts ? (
              <a href="#latest" className={anchorClass}>
                Latest
              </a>
            ) : null}
            {hasSports ? (
              <a href="#sports" className={`hidden ${anchorClass} sm:inline`}>
                Sports
              </a>
            ) : null}
            {hasPosts ? (
              <a href="#media" className={anchorClass}>
                Media
              </a>
            ) : null}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
