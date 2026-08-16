import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { listTracks } from "@/lib/server/tracksRepo";
import type { Site } from "@/lib/sites";
import { circuitsHref, trackHref } from "@/lib/tracks";
import { CircuitIndex } from "../circuits/CircuitIndex";
import { SiteShell } from "../SiteShell";

/**
 * Every circuit, in the order the admin arranged them.
 *
 * A page of its own rather than a section of the home page, for the same reason
 * the circuits are a table and not a field on a round: a circuit outlives the
 * season that visits it. The calendar links here; this does not belong to the
 * calendar.
 *
 * This sport's circuits, and only this sport's — a circuit belongs to a site,
 * so `/pickle/circuits` is a different list from `/incrc/circuits` and neither
 * can show the other's.
 *
 * An unreachable database renders the error boundary, the same as everywhere
 * else. It used to render an empty state instead — a circuits page listing no
 * circuits, which reads as "CTR races nowhere" rather than as the outage it is.
 */

export async function circuitsMetadata(site: Site): Promise<Metadata> {
  const tracks = await listTracks(site.id);

  const title = "Circuits";
  const description = tracks.length
    ? `Layouts, lengths and lap records for ${tracks.length} circuits: ${tracks
        .map((track) => track.name)
        .join(", ")}.`
    : "The circuits the championship runs on.";

  return {
    title,
    description,
    alternates: { canonical: circuitsHref(site) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${circuitsHref(site)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export async function CircuitsIndex({ site }: { site: Site }) {
  const tracks = await listTracks(site.id);

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
        url: `${SITE.url}${trackHref(site, track)}`,
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

      <SiteShell site={site} year={new Date().getFullYear()}>
        <CircuitIndex site={site} tracks={tracks} />
      </SiteShell>
    </>
  );
}
