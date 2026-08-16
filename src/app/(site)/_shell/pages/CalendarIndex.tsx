import { notFound, redirect } from "next/navigation";
import { seasonHref } from "@/lib/seasons";
import { currentPublishedSeason } from "@/lib/server/seasonsRepo";
import type { Site } from "@/lib/sites";

/**
 * `/<sport>/calendar` — whichever season is running.
 *
 * A door, not a page. Before 0021 this listed every round the sport had ever
 * had, because that was the only list there was; now each season has a page of
 * its own and this one would be an index of one card in its first year and a
 * page nobody stops on ever after.
 *
 * So it sends you to the season that is running and the season page carries the
 * archive at its foot — one click from what you came for, rather than a page in
 * front of it. `currentSeason` explains how "running" is decided; the short of
 * it is the next round that has not finished, so this rolls over on its own.
 *
 * ── Why the redirect stays, rather than the route being deleted ───────────
 *
 * `/incrc/calendar` is in nav bars, in stored links inside page sections, on
 * whatever anybody has already printed, and it reads better than a year in a
 * URL somebody has to know. It keeps working and always lands on the right
 * season. It is left out of the sitemap, which lists the seasons themselves.
 *
 * Temporary, not permanent: which season this means changes every year, and a
 * 308 would be cached by browsers long after it stopped being true.
 *
 * Not a component. Both paths out of it throw — that is what `redirect` and
 * `notFound` do — so there is no element to return and `Promise<never>` says so.
 * The routes `return` it, which is how a page whose whole body is a redirect
 * still satisfies the signature.
 */
export async function sendToCurrentSeason(site: Site): Promise<never> {
  // The throwing loader, for the reason the circuit page gives: a database that
  // is down must be a 500, not a 404 a crawler will believe.
  const current = await currentPublishedSeason(site.id);

  // No season published at all. Not an empty page — there is nothing to show,
  // and the sport may not run a calendar in the first place.
  if (!current) notFound();

  redirect(seasonHref(site, current.season));
}
