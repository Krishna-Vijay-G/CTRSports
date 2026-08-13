import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { getLandingContentSafe } from "@/lib/server/contentRepo";
import { listTracksSafe } from "@/lib/server/tracksRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { trackSlug } from "@/lib/tracks";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CircuitIndex } from "./_components/CircuitIndex";

/**
 * Every circuit, in the order the admin arranged them.
 *
 * A page of its own rather than a section of /incrc, for the same reason the
 * circuits are a table and not a field on a round: a circuit outlives the season
 * that visits it. The calendar links here; this does not belong to the calendar.
 *
 * The chrome is the LANDING document, as everywhere else — the header and footer
 * around this page stay in step with the home page when either is edited.
 *
 * `listTracksSafe`, so an unreachable database renders an empty state rather
 * than an error page. The detail route deliberately does the opposite; see the
 * note there.
 */

export const revalidate = 60;

/** Nothing on this page is an anchor — every nav link goes home. */
const LOCAL_ANCHORS: string[] = [];

export async function generateMetadata(): Promise<Metadata> {
  const tracks = await listTracksSafe();

  const title = "Circuits";
  const description = tracks.length
    ? `Layouts, lengths and lap records for ${tracks.length} circuits: ${tracks
        .map((track) => track.name)
        .join(", ")}.`
    : "The circuits the championship runs on.";

  return {
    title,
    description,
    alternates: { canonical: "/circuits" },
    openGraph: {
      title,
      description,
      url: `${SITE.url}/circuits`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export default async function CircuitsPage() {
  const [tracks, landing] = await Promise.all([listTracksSafe(), getLandingContentSafe()]);
  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);

  // A circuit is a real place with a real layout — worth saying so in a way a
  // search engine can read, not only in prose.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Circuits",
    itemListElement: tracks.map((track, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: track.name,
        url: `${SITE.url}/circuits/${trackSlug(track)}`,
        ...(track.photo_url ? { image: track.photo_url } : {}),
        ...(track.location
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: track.location,
                addressCountry: "IN",
              },
            }
          : {}),
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
        {/* Same shell as every other route: the page colour showing around one
            rounded card, capped at 1920 so a full-HD window is filled. */}
        <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            {/* No banner to lie over here, so the header is a solid bar in the
                flow — the same fallback /incrc uses with its carousel emptied. */}
            <SiteHeader
              content={chrome}
              home={false}
              className="relative z-20 border-b border-line bg-surface"
            />
            <CircuitIndex tracks={tracks} />
          </main>

          <SiteFooter content={chrome} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
