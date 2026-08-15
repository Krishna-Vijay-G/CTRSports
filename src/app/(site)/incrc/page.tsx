import type { Metadata } from "next";
import { SITE } from "@/config/site";
import type { IncrcContent } from "@/lib/incrcContent";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import { getIncrcContent, getLandingContent } from "@/lib/server/contentRepo";
import { listDeckSummaries } from "@/lib/server/decksRepo";
import { listFormsForPage } from "@/lib/server/formsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { findTrack, trackHref } from "@/lib/tracks";
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
 * Two documents, both assembled from `ctr.page_sections` and the four tables
 * promoted out of it:
 *
 *   'incrc'   — everything in the body, including which sections are on the page
 *               and in what order. Edited at /admin/incrc.
 *   'landing' — the header, the navigation and the footer, so the chrome around
 *               this page stays in step with the home page.
 *
 * Neither loader falls back. A database this page cannot read is an outage, and
 * it renders the error boundary rather than a stale copy of the championship.
 *
 * Same shell as the landing page: the page colour showing around one rounded
 * card, every section on `.shell` for the shared horizontal rhythm.
 */

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getIncrcContent();
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
 * so this is the same list the page is built from; the three the shell owns are
 * added by `sendAnchorsHome`.
 */
const LOCAL_ANCHORS = new Set([
  "#announcement",
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
  "#registrations",
  "#decks",
]);

export default async function IncrcPage() {
  const [content, landing, tracks, forms, decks, articles] = await Promise.all([
    getIncrcContent(),
    getLandingContent(),
    listTracks(),
    listFormsForPage("incrc"),
    listDeckSummaries(),
    listPublishedArticles(),
  ]);

  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);

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
    // The circuits themselves, from ctr.tracks — the same rows the venues
    // section and /circuits render, so the markup cannot drift from the page.
    location: tracks.map((track) => ({
      "@type": "Place",
      name: track.name,
      url: `${SITE.url}${trackHref(track)}`,
      address: { "@type": "PostalAddress", addressLocality: track.location, addressCountry: "IN" },
    })),
    // Now that rounds carry real dates, say so: a SportsEvent with a startDate
    // is eligible for the dated event treatment in search results, and a bare
    // one is not.
    subEvent: content.calendar.rounds.map((round) => {
      const track = findTrack(tracks, round.trackId);

      return {
        "@type": "SportsEvent",
        name: `${content.meta.short} Round ${round.round}`,
        ...(round.start ? { startDate: round.start } : {}),
        ...(round.end || round.start ? { endDate: round.end || round.start } : {}),
        location: {
          "@type": "Place",
          name: track?.name || round.venue,
          address: {
            "@type": "PostalAddress",
            addressLocality: track?.location || round.city,
            addressCountry: "IN",
          },
        },
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the banner photo to the card's radius.
            1920 so a full-HD window is filled rather than framed in page colour;
            past that the card centres and the margin grows. */}
        <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <IncrcTop banners={content.banners} chrome={chrome} />
            <IncrcSections
              content={content}
              tracks={tracks}
              forms={forms}
              decks={decks}
              articles={articles}
            />
          </main>

          <SiteFooter content={chrome} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
