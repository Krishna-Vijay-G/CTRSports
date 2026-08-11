import { listVisibleSportsSafe } from "@/lib/server/sportsRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AboutSection } from "./_components/AboutSection";
import { CtaBand } from "./_components/CtaBand";
import { Hero } from "./_components/Hero";
import { SplashScreen } from "./_components/SplashScreen";
import { SportsSection } from "./_components/SportsSection";

/**
 * The landing page: who CTR is, and which sports it runs. Nothing else lives
 * here — future verticals get their own route under src/app/(site)/.
 *
 * Everything sits inside one rounded white card with the page colour showing
 * around it. That card is the layout: a new section is a child of it, and picks
 * up the horizontal rhythm by using `.shell`.
 *
 * Re-rendered at most once a minute. Saving in the admin also revalidates this
 * path, so an edit is live immediately rather than up to a minute later.
 */
export const revalidate = 60;

export default async function LandingPage() {
  const sports = await listVisibleSportsSafe();

  return (
    <>
      <SplashScreen />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the hero photo to the card's radius. */}
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <Hero sports={sports} />
            <AboutSection />
            <SportsSection sports={sports} />
            <CtaBand sports={sports} />
          </main>

          <SiteFooter year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
