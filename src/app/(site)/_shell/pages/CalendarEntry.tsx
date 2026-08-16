import type { Metadata } from "next";
import { getSeasonBySlug } from "@/lib/server/seasonsRepo";
import type { Site } from "@/lib/sites";
import { EventDetail, eventMetadata } from "./EventDetail";
import { SeasonDetail, seasonMetadata } from "./SeasonDetail";

/**
 * `/<sport>/calendar/<slug>` — a season, or one round of one.
 *
 * One route over two tables, which is the whole point of the address: a reader
 * following "the 2026 season" and a reader following "round three" are in the
 * same place looking at different depths of it, and neither should have to know
 * which noun the URL wants.
 *
 * A season and a round of one sport can never share a slug — every write of
 * either goes through `findCalendarSlugOwner`, and 0021's reconcile refuses the
 * state outright — so this has no tie to break. It asks for a season and falls
 * through, which costs one indexed lookup on a round's page and nothing at all
 * on a season's.
 *
 * The lookup is `cache()`d, so the ask here and the ask inside `SeasonDetail`
 * are one round trip.
 */

export async function calendarEntryMetadata(site: Site, slug: string): Promise<Metadata> {
  const season = await getSeasonBySlug(site.id, slug).catch(() => null);

  return season ? seasonMetadata(site, slug) : eventMetadata(site, slug);
}

export async function CalendarEntry({ site, slug }: { site: Site; slug: string }) {
  // Not `.catch(() => null)`: a database that is down must reach the error
  // boundary as a 500, not fall through to the event page and 404.
  const season = await getSeasonBySlug(site.id, slug);

  return season ? (
    <SeasonDetail site={site} slug={slug} />
  ) : (
    <EventDetail site={site} slug={slug} />
  );
}
