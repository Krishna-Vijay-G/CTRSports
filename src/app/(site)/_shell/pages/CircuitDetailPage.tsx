import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/config/site";
import { listPublishedEvents } from "@/lib/server/eventsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import type { Site } from "@/lib/sites";
import { findTrackBySlug, majorEventList, trackHref, type Track } from "@/lib/tracks";
import { lapRecord } from "../circuits/facts";
import { CircuitDetail } from "../circuits/CircuitDetail";
import { SiteShell } from "../SiteShell";

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

async function load(
  site: Site,
  slug: string
): Promise<{ track: Track; tracks: Track[] } | null> {
  const tracks = await listTracks(site.id);
  const track = findTrackBySlug(tracks, slug);
  return track ? { track, tracks } : null;
}

export async function circuitMetadata(site: Site, slug: string): Promise<Metadata> {
  const found = await load(site, slug);

  if (!found) return { title: "Circuit not found" };

  const { track } = found;
  const title = track.location ? `${track.name} — ${track.location}` : track.name;

  return {
    title,
    description: describe(track),
    alternates: { canonical: trackHref(site, track) },
    openGraph: {
      title,
      description: describe(track),
      url: `${SITE.url}${trackHref(site, track)}`,
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

export async function CircuitDetailPage({ site, slug }: { site: Site; slug: string }) {
  const [found, season] = await Promise.all([
    load(site, slug),
    /*
     * The weekends run at this circuit, from this sport's own season.
     *
     * A query rather than a read of the home page's calendar band, which is what
     * it was until 0018: the rounds lived inside that section's stored value, so
     * finding out what happened at a circuit meant loading a page that has
     * nothing to do with it. An event is a row now.
     */
    listPublishedEvents(site.id),
  ]);

  if (!found) notFound();

  const { track, tracks } = found;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: track.name,
    url: `${SITE.url}${trackHref(site, track)}`,
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

      <SiteShell site={site} year={new Date().getFullYear()}>
        <CircuitDetail site={site} track={track} tracks={tracks} season={season} />
      </SiteShell>
    </>
  );
}
