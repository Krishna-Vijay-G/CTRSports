import { listVisibleSportsSafe } from "@/lib/server/sportsRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AboutSection } from "./_components/AboutSection";
import { Hero } from "./_components/Hero";
import { SplashScreen } from "./_components/SplashScreen";
import { SportsSection } from "./_components/SportsSection";

/**
 * The landing page: who CTR is, and which sports it runs. Nothing else lives
 * here — future verticals get their own route under src/app/(site)/.
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

      <div id="top" className="min-h-screen">
        <SiteHeader />

        <main id="main-content">
          <Hero />
          <AboutSection />
          <SportsSection sports={sports} />
        </main>

        <SiteFooter year={new Date().getFullYear()} />
      </div>
    </>
  );
}
