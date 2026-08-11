import type { Metadata } from "next";
import { SITE } from "@/config/site";
import type { IncrcContent } from "@/lib/incrcContent";
import type { LandingContent } from "@/lib/landingContent";
import { getIncrcContentSafe, getLandingContentSafe } from "@/lib/server/contentRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { IncrcSections } from "./_components/IncrcSections";
import { IncrcTop } from "./_components/IncrcTop";

/**
 * The Indian National Car Racing Championship.
 *
 * Only the championship: what it is, what it is for, where and when it runs, who
 * put it together and how to enter. CTR's own story — the origin, the IRL and F4
 * results, the karting league, the academy, the club — is not on this page,
 * because none of it is INCRC.
 *
 * Two documents, both from `ctr_content`:
 *
 *   'incrc'   — everything in the body, including which sections are on the page
 *               and in what order. Edited at /admin/incrc.
 *   'landing' — the header, the navigation and the footer, so the chrome around
 *               this page stays in step with the home page.
 *
 * Both loaders fall back rather than throw, so an unreachable database still
 * renders a complete page.
 *
 * Same shell as the landing page: the page colour showing around one rounded
 * card, every section on `.shell` for the shared horizontal rhythm.
 */

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getIncrcContentSafe();
  const title = `${content.meta.name} — ${content.meta.tagline}`;
  const description = describe(content);

  return {
    title,
    description,
    alternates: { canonical: "/incrc" },
    openGraph: {
      title,
      description,
      url: `${SITE.url}/incrc`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

/** The headline plus whatever numbers the stats band is currently carrying. */
function describe(content: IncrcContent): string {
  const numbers = content.stats.items
    .filter((stat) => stat.value && stat.label)
    .map((stat) => `${stat.value} ${stat.label.toLowerCase()}`)
    .join(", ");

  return numbers ? `${content.intro.headline}. ${numbers}.` : content.intro.headline;
}

/**
 * The in-page anchors this route has. Every section renders one with its own id,
 * so this is derived from the same list the page is built from — plus the two
 * the shell owns.
 */
const LOCAL_ANCHORS = new Set([
  "#top",
  "#main-content",
  "#footer",
  "#intro",
  "#stats",
  "#vision",
  "#grid",
  "#venues",
  "#calendar",
  "#partnership",
  "#rows",
  "#posts",
  "#register",
]);

/**
 * The navigation is written for the landing page, so most of its links are bare
 * anchors — `#about`, `#sports`. On this route those scroll nowhere. Point the
 * ones this page does not have at the same section on the home page instead, and
 * leave the ones it does have alone.
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
  const [content, landing] = await Promise.all([
    getIncrcContentSafe(),
    getLandingContentSafe(),
  ]);

  const chrome = sendHome(landing);

  // The championship is a real, dated sporting event — worth saying so in a way
  // a search engine can read, rather than only in prose.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: content.meta.name,
    alternateName: content.meta.short,
    description: describe(content),
    sport: "Motorsport",
    url: `${SITE.url}/incrc`,
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "SportsOrganization",
      name: landing.brand.name,
      url: SITE.url,
    },
    location: content.venues.items.map((venue) => ({
      "@type": "Place",
      name: venue.name,
      address: { "@type": "PostalAddress", addressLocality: venue.city, addressCountry: "IN" },
    })),
    subEvent: content.calendar.rounds.map((round) => ({
      "@type": "SportsEvent",
      name: `${content.meta.short} Round ${round.round}`,
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
        {/* overflow-hidden is what clips the banner photo to the card's radius. */}
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <IncrcTop banners={content.banners} chrome={chrome} />
            <IncrcSections content={content} />
          </main>

          <SiteFooter content={chrome} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
