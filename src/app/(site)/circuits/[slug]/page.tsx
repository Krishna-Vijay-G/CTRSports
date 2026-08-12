import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/config/site";
import { getIncrcContentSafe, getLandingContentSafe } from "@/lib/server/contentRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { findTrackBySlug, majorEventList, trackSlug, type Track } from "@/lib/tracks";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { lapRecord } from "../_components/facts";
import { CircuitDetail } from "../_components/CircuitDetail";

/**
 * One circuit.
 *
 * `listTracks` rather than the safe loader, on purpose. This route decides
 * between rendering and 404 on what came back, and an unreachable database that
 * quietly returned an empty list would turn every real circuit into "no such
 * page" — which is a lie a crawler will believe and act on. Throwing gives a 500,
 * which is what a transient failure actually is, and the ISR window keeps serving
 * the last good page in the meantime.
 *
 * No `generateStaticParams`: circuits are added and renamed from the admin, and a
 * build-time list would leave a new one unreachable until the next deploy.
 */

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

/** The anchors this route has. Everything else in the nav goes home. */
const LOCAL_ANCHORS: string[] = [];

async function load(slug: string): Promise<{ track: Track; tracks: Track[] } | null> {
  const tracks = await listTracks();
  const track = findTrackBySlug(tracks, slug);
  return track ? { track, tracks } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);

  if (!found) return { title: "Circuit not found" };

  const { track } = found;
  const title = track.location ? `${track.name} — ${track.location}` : track.name;

  return {
    title,
    description: describe(track),
    alternates: { canonical: `/circuits/${trackSlug(track)}` },
    openGraph: {
      title,
      description: describe(track),
      url: `${SITE.url}/circuits/${trackSlug(track)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
      ...(track.photo_url ? { images: [track.photo_url] } : {}),
    },
  };
}

/** The note if there is one, then whatever the record can add to it. */
function describe(track: Track): string {
  const numbers = [
    track.length && `${track.length} long`,
    track.turns && `${track.turns} turns`,
    lapRecord(track) && `lap record ${lapRecord(track)}`,
  ]
    .filter(Boolean)
    .join(", ");

  const lead = track.note || `${track.name}${track.location ? `, ${track.location}` : ""}.`;
  return numbers ? `${lead} ${capitalise(numbers)}.` : lead;
}

/** The related links that point off this site, for `sameAs`. */
function externalLinks(track: Track): string[] {
  return track.links.map((link) => link.href).filter((href) => /^https?:/i.test(href));
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function CircuitPage({ params }: Params) {
  const { slug } = await params;

  const [found, landing, incrc] = await Promise.all([
    load(slug),
    getLandingContentSafe(),
    getIncrcContentSafe(),
  ]);

  if (!found) notFound();

  const { track, tracks } = found;
  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: track.name,
    url: `${SITE.url}/circuits/${trackSlug(track)}`,
    description: describe(track),
    ...(track.photo_url ? { image: track.photo_url } : {}),
    // Every related link that leaves this site. `sameAs` means "the same thing,
    // elsewhere", so a /public path of our own would be wrong in it.
    ...(externalLinks(track).length > 0 ? { sameAs: externalLinks(track) } : {}),
    ...(track.location
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: track.location,
            addressCountry: "IN",
          },
        }
      : {}),
    ...(majorEventList(track).length > 0
      ? { event: majorEventList(track).map((name) => ({ "@type": "SportsEvent", name })) }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <CircuitDetail
              track={track}
              tracks={tracks}
              rounds={incrc.calendar.rounds}
              // A collage has no full-bleed photograph to lay a header over, so
              // this is the solid bar in the flow — the same one /circuits uses.
              header={
                <SiteHeader
                  content={chrome}
                  className="relative z-20 border-b border-line bg-surface"
                />
              }
            />
          </main>

          <SiteFooter content={chrome} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
