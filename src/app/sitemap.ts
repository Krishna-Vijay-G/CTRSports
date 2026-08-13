import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { listTracksSafe } from "@/lib/server/tracksRepo";
import { trackSlug } from "@/lib/tracks";

/**
 * Add a line here when a new public page lands.
 *
 * The circuits are read from the table rather than listed by hand, because they
 * are added from the admin: a hand-written list would leave a new circuit out of
 * the sitemap until someone remembered this file. The safe loader is used on
 * purpose — a sitemap that fails the build over an unreachable database would
 * take the whole deploy with it, and a short sitemap is a far smaller problem.
 *
 * The registration forms at /register/<slug> are deliberately NOT here. Each one
 * sets `robots: noindex` — a form has nothing to rank for, and a closed one in a
 * search result is worse than nothing — so listing them would be asking a
 * crawler to fetch pages it is then told to forget.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const tracks = await listTracksSafe();

  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/incrc`,
      lastModified: now,
      // The championship's dates and venues are set for the season; only the
      // round results would move, and those are not on this page yet.
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE.url}/circuits`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...tracks.map((track) => ({
      url: `${SITE.url}/circuits/${trackSlug(track)}`,
      lastModified: now,
      // A circuit's record changes when a lap record falls, which is a handful
      // of times a season at most.
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
