import { SITE } from "@/config/site";
import { getLandingContentSafe } from "@/lib/server/contentRepo";
import { listVisibleSportsSafe } from "@/lib/server/sportsRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BannerCarousel } from "./_components/banner/BannerCarousel";
import { SplashScreen } from "./_components/SplashScreen";
import { AboutSection } from "./_components/sections/AboutSection";
import { CtaBand } from "./_components/sections/CtaBand";
import { SportsSection } from "./_components/sections/SportsSection";

/**
 * The landing page: who CTR is, and which sports it runs.
 *
 * Every word and picture comes from the database — the copy as one document
 * (`ctr_content`), the sports as rows (`ctr_sports`). Both loaders fall back
 * rather than throw, so an unreachable database still renders a complete page.
 *
 * Everything sits inside one rounded card with the page colour showing around
 * it. That card is the layout: a new section is a child of it and picks up the
 * horizontal rhythm from `.shell`.
 *
 * Re-rendered at most once a minute. Saving in the admin also revalidates this
 * path, so an edit is live immediately rather than up to a minute later.
 */
export const revalidate = 60;

export default async function LandingPage() {
  const [content, sports] = await Promise.all([
    getLandingContentSafe(),
    listVisibleSportsSafe(),
  ]);

  // Built here rather than in the root layout because `sameAs` and the logo are
  // editable content, and only this route loads the document.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: content.brand.name,
    alternateName: `${content.brand.name} ${content.brand.subtitle}`,
    url: SITE.url,
    logo: content.brand.logo.startsWith("/")
      ? `${SITE.url}${content.brand.logo}`
      : content.brand.logo,
    sameAs: content.socials.map((social) => social.href),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SplashScreen splash={content.splash} />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the banner photo to the card's radius. */}
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <BannerCarousel
              banners={content.banners}
              header={<SiteHeader content={content} />}
            />
            <AboutSection about={content.about} />
            <SportsSection heading={content.sportsSection} sports={sports} />
            <CtaBand band={content.ctaBand} sports={sports} />
          </main>

          <SiteFooter content={content} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
