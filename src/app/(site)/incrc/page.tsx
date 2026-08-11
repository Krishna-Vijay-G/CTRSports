import type { Metadata } from "next";
import { SITE } from "@/config/site";
import type { LandingContent } from "@/lib/landingContent";
import { getLandingContentSafe } from "@/lib/server/contentRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { INCRC } from "./_data/incrc";
import { CalendarSection } from "./_components/CalendarSection";
import { FamilyBanner } from "./_components/FamilyBanner";
import { GridSection } from "./_components/GridSection";
import { IncrcHero } from "./_components/IncrcHero";
import { PartnershipSection } from "./_components/PartnershipSection";
import { RegisterBand } from "./_components/RegisterBand";
import { StatsBand } from "./_components/StatsBand";
import { VenuesSection } from "./_components/VenuesSection";
import { VisionSection } from "./_components/VisionSection";

/**
 * The Indian National Car Racing Championship.
 *
 * Only the championship: what it is, what it is for, where and when it runs,
 * who put it together and how to enter. CTR's own story — the origin, the IRL
 * and F4 results, the karting league, the academy, the club — is not on this
 * page, because none of it is INCRC.
 *
 * The championship's own copy is a code module (`_data/incrc.ts`), not the
 * database. Only the brand, navigation and footer come from `ctr_content`, so
 * that the chrome around this page stays in step with the landing page when
 * either is edited.
 *
 * Same shell as the landing page: the page colour showing around one rounded
 * card, every section on `.shell` for the shared horizontal rhythm.
 */

const description = `${INCRC.headline}. ${INCRC.stats[0].value} racing categories across ${INCRC.stats[1].value} rounds on ${INCRC.stats[2].value} of India's finest circuits, from ${INCRC.stats[3].value}.`;

export const metadata: Metadata = {
  title: `${INCRC.name} — ${INCRC.tagline}`,
  description,
  alternates: { canonical: "/incrc" },
  openGraph: {
    title: `${INCRC.name} — ${INCRC.tagline}`,
    description,
    url: `${SITE.url}/incrc`,
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
  },
};

/**
 * Re-rendered at most once an hour. Nothing on this page is edited in the admin
 * except the header and footer, so it does not need the landing page's minute.
 */
export const revalidate = 3600;

/**
 * The in-page anchors this route actually has, so `sendHome` knows which of the
 * navigation's links mean something here. Add a section, add its id.
 */
const LOCAL_ANCHORS = new Set([
  "#top",
  "#main-content",
  "#vision",
  "#grid",
  "#venues",
  "#calendar",
  "#partnership",
  "#register",
  "#footer",
]);

/**
 * The navigation is written for the landing page, so most of its links are bare
 * anchors — `#about`, `#sports`. On this route those scroll nowhere. Point the
 * ones this page does not have at the same section on the home page instead,
 * and leave the ones it does have (`#top`, `#footer`) alone.
 */
function sendHome(content: LandingContent): LandingContent {
  const fix = (href: string) =>
    href.startsWith("#") && !LOCAL_ANCHORS.has(href) ? `/${href}` : href;

  return {
    ...content,
    nav: {
      links: content.nav.links.map((link) => ({ ...link, href: fix(link.href) })),
      cta: { ...content.nav.cta, href: fix(content.nav.cta.href) },
    },
  };
}

export default async function IncrcPage() {
  const content = sendHome(await getLandingContentSafe());

  // The championship is a real, dated sporting event — worth saying so in a way
  // a search engine can read, rather than only in prose.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: INCRC.name,
    alternateName: INCRC.short,
    description,
    sport: "Motorsport",
    url: `${SITE.url}/incrc`,
    startDate: "2026-09-11",
    endDate: "2026-12-13",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: { "@type": "SportsOrganization", name: content.brand.name, url: SITE.url },
    location: INCRC.venues.map((venue) => ({
      "@type": "Place",
      name: venue.name,
      address: { "@type": "PostalAddress", addressLocality: venue.city, addressCountry: "IN" },
    })),
    subEvent: INCRC.rounds.map((round) => ({
      "@type": "SportsEvent",
      name: `${INCRC.short} Round ${round.round}`,
      location: {
        "@type": "Place",
        name: round.venue,
        address: { "@type": "PostalAddress", addressLocality: round.city, addressCountry: "IN" },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the hero's wash to the card's radius. */}
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <IncrcHero content={content} />
            <StatsBand />
            <VisionSection />
            <GridSection />
            <VenuesSection />
            <CalendarSection />
            <PartnershipSection />
            <FamilyBanner />
            <RegisterBand />
          </main>

          <SiteFooter content={content} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
