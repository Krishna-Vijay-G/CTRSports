import type { LandingContent } from "@/lib/landingContent";
import type { MediaPost } from "@/lib/posts";
import type { MarqueeItem } from "@/lib/marquee";
import { PostBanners } from "@/components/post/PostBanners";
import { PostGrid } from "@/components/post/PostGrid";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { SplashScreen } from "./SplashScreen";
import { SportsSection } from "./SportsSection";

/** How many of the newest posts run as full-bleed banners under the hero. */
const BANNER_COUNT = 3;

export function LandingPage({
  content,
  posts,
  marquee,
  year,
}: {
  content: LandingContent;
  posts: MediaPost[];
  marquee: MarqueeItem[];
  year: number;
}) {
  return (
    <>
      <SplashScreen splash={content.splash} />

      <div id="top" className="min-h-screen bg-carbon-950 font-body text-white/90">
        <LandingHeader
          brand={content.brand}
          hasPosts={posts.length > 0}
          hasSports={content.sports.length > 0}
          marquee={marquee}
        />

        <main id="main-content">
          <LandingHero hero={content.hero} />

          <PostBanners posts={posts.slice(0, BANNER_COUNT)} />

          <SportsSection heading={content.sports_section} sports={content.sports} />

          {/* Every post, as a grid, at the bottom of the page. */}
          <div className="border-t border-white/5">
            <PostGrid posts={posts} />
          </div>
        </main>

        <LandingFooter brand={content.brand} socials={content.socials} year={year} />
      </div>
    </>
  );
}
