import type { Metadata } from "next";
import { SEO, SITE } from "@/config/site";
import type { Chrome } from "@/lib/chrome";
import { eventHref, eventName, type EventSummary } from "@/lib/events";
import { anchorsOf, metaOf, type Section } from "@/lib/sections/document";
import type { Intro } from "@/lib/sections/intro/model";
import { PageSections } from "@/lib/sections/render";
import { SplashScreen } from "@/lib/sections/splash/view";
import type { Stats } from "@/lib/sections/stats/model";
import { getChrome, readSitePage } from "@/lib/server/contentRepo";
import { getRecords } from "@/lib/server/recordsRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { siteHref, type Site } from "@/lib/sites";
import { findTrack, trackHref } from "@/lib/tracks";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * A site's own address: `/` for the landing page, `/incrc` for a sport.
 *
 * One component for both, because there is nothing left that differs. The two
 * routes that use it are two files only because Next needs a `page.tsx` per
 * address — everything they do is here.
 *
 * Built from the site's sections, in the order they are stored. Nothing falls
 * back: a database this page cannot read is an outage, and it renders the error
 * boundary rather than an older version of the site dressed up as the current
 * one.
 *
 * ── Why this one does not use SiteShell ───────────────────────────────────
 *
 * Because its header is not above the page, it is INSIDE it — laid over the
 * banner carousel by whichever section declares `carriesHeader`. The shell
 * draws a solid bar, which is right for every route that has no photograph to
 * lay one over and wrong for this one.
 */

async function load(site: Site) {
  const sections = await readSitePage(site, "home");
  const [chrome, records] = await Promise.all([getChrome(site), getRecords(site, sections)]);
  return { sections, chrome, records };
}

/**
 * The headline plus whatever numbers the page is carrying.
 *
 * Reads the sections rather than named fields of a document, because there is
 * no longer a document with named fields — and because a page may carry two
 * introductions or none, so "the headline" is "the first one there is".
 */
function describe(sections: readonly Section[]): string {
  const intro = sections.find((section) => section.type === "intro")?.data as Intro | undefined;
  const headline = intro?.headline ?? "";

  const numbers = sections
    .filter((section) => section.type === "stats")
    .flatMap((section) => (section.data as Stats).items)
    .filter((stat) => stat.value && stat.label)
    .map((stat) => `${stat.value} ${stat.label.toLowerCase()}`)
    .join(", ");

  return numbers ? `${headline}. ${numbers}.` : headline;
}

export async function homeMetadata(site: Site): Promise<Metadata> {
  const sections = await readSitePage(site, "home");
  const meta = metaOf(sections);
  const here = siteHref(site) || "/";

  // The landing page has no identity section written yet, and inventing a title
  // from a blank one would put an empty string in the tab. The deployment's own
  // name is the honest fallback.
  const title = meta.name ? [meta.name, meta.tagline].filter(Boolean).join(" — ") : SITE.name;
  const description = describe(sections) || SEO.description;

  return {
    title,
    description,
    alternates: { canonical: here },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${here}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export async function SiteHome({ site }: { site: Site }) {
  const { sections, chrome, records } = await load(site);

  // Every anchor this page has is one of its sections'. That used to be a
  // hand-kept set in each route, which is a list that rots the moment a section
  // moves.
  const header = sendAnchorsHome(site, chrome, anchorsOf(sections));
  const meta = metaOf(sections);
  const { tracks } = records;

  const jsonLd =
    site.kind === "root"
      ? organisation(chrome)
      : championship(site, sections, meta, tracks, records.events);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
        The splash covers the page while the first photograph loads, and it is
        drawn for whichever site has written one. That used to read
        `site.kind === "root"`, because there was one chrome and only the landing
        page was meant to have a splash; a sport has its own chrome now, so the
        honest test is whether it has a splash rather than which site it is.

        Nothing changes today: 0017 gave every sport a chrome with an EMPTY
        splash, and `SplashScreen` renders nothing without a mark or a name — so
        a sport reached from the landing page still does not pay for a second
        one, and a sport that wants its own now has the field to fill in.
      */}
      <SplashScreen splash={chrome.splash} />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the banner photo to the card's radius.
            1920 so a full-HD window is filled rather than framed in page colour;
            past that the card centres and the margin grows. */}
        <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <PageSections
              sections={sections}
              records={records}
              header={<SiteHeader content={header} home={site.kind === "root"} />}
            />
          </main>

          <SiteFooter content={header} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────── Structured data ───────────────────────────── */

/**
 * The root site is the organisation. A sport is an event it runs.
 *
 * Two shapes rather than one with holes in it: `SportsOrganization` and
 * `SportsEvent` are different things to a search engine, and emitting the wrong
 * one for a page is worse than emitting none.
 */
function organisation(chrome: Chrome) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: chrome.brand.name,
    alternateName: `${chrome.brand.name} ${chrome.brand.subtitle}`,
    url: SITE.url,
    logo: chrome.brand.logo.startsWith("/")
      ? `${SITE.url}${chrome.brand.logo}`
      : chrome.brand.logo,
    sameAs: chrome.socials.map((social) => social.href),
    // The footer's contact block, said in a way a search engine can read. Each
    // is omitted when it is blank rather than emitted empty: a property with
    // nothing in it is worse than an absent one, because it asserts that there
    // is no phone number rather than saying nothing about it.
    ...(chrome.contact.address
      ? {
          address: {
            "@type": "PostalAddress",
            // The lines as typed, joined — Schema wants one string here, and
            // this is the one place the newlines are not the presentation.
            streetAddress: chrome.contact.address.split("\n").join(", "),
            addressCountry: "IN",
          },
        }
      : {}),
    ...(chrome.contact.phone ? { telephone: chrome.contact.phone } : {}),
    ...(chrome.contact.email ? { email: chrome.contact.email } : {}),
  };
}

function championship(
  site: Site,
  sections: readonly Section[],
  meta: ReturnType<typeof metaOf>,
  tracks: Parameters<typeof findTrack>[0],
  events: readonly EventSummary[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: meta.name,
    alternateName: meta.short,
    description: describe(sections),
    sport: "Motorsport",
    url: `${SITE.url}${siteHref(site)}`,
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "SportsOrganization",
      name: SITE.name,
      url: SITE.url,
    },
    // The circuits themselves, from ctr.tracks — the same rows the venues
    // section and the circuits index render, so the markup cannot drift.
    location: tracks.map((track) => ({
      "@type": "Place",
      name: track.name,
      url: `${SITE.url}${trackHref(site, track)}`,
      address: { "@type": "PostalAddress", addressLocality: track.location, addressCountry: "IN" },
    })),
    /*
     * The season, from ctr.events rather than from a section's stored value.
     *
     * Events carry real dates, so say so: a SportsEvent with a startDate is
     * eligible for the dated event treatment in search results, and a bare one
     * is not. Each one also has a `url` now, which it could not before 0018 —
     * a sub-event a search engine can link to is the whole difference between
     * "this championship exists" and "round three is at Bren on 13 November".
     */
    subEvent: events.map((event) => {
      const track = findTrack(tracks, event.track_id);

      return {
        "@type": "SportsEvent",
        name: eventName(event, track?.name) || `${meta.short} ${event.round}`.trim(),
        url: `${SITE.url}${eventHref(site, event)}`,
        ...(event.date_from ? { startDate: event.date_from } : {}),
        ...(event.date_to || event.date_from
          ? { endDate: event.date_to || event.date_from }
          : {}),
        location: {
          "@type": "Place",
          name: track?.name || event.venue,
          address: {
            "@type": "PostalAddress",
            addressLocality: track?.location || event.city,
            addressCountry: "IN",
          },
        },
      };
    }),
  };
}
