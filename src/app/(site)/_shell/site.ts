import "server-only";

import { notFound } from "next/navigation";
import { getRootSite, getSiteBySlug } from "@/lib/server/sitesRepo";
import { hasModule, type Site, type SiteModule } from "@/lib/sites";

/**
 * Which site a public route is serving, and whether it may serve it.
 *
 * Two entry points because there are two route trees: `/…` for the root site
 * and `/[sport]/…` for the others. Everything below that is the same, which is
 * the point — a sport's articles index and the landing page's are one component
 * handed a different site.
 *
 * ── What 404s ─────────────────────────────────────────────────────────────
 *
 *   an unknown segment   there is no such sport
 *   a draft sport        not on the internet yet
 *   a module switched off  `/pickle/circuits` when Pickleball has no circuits
 *
 * All three are `notFound()` rather than a message, and the third is the reason
 * this helper exists at all: the route file for a module a site does not have
 * still EXISTS — every site's tree is the same tree — so something has to
 * refuse it, and the site's own module list is the only honest answer.
 *
 * ── Why a draft 404s for everybody ────────────────────────────────────────
 *
 * Including its own team. Telling them apart means reading the session cookie,
 * and a public route that reads a cookie cannot be prerendered — every visit to
 * every sport page would be rendered on demand to hide a page from nobody. The
 * console's preview is where a draft is looked at before it goes live.
 */

/** The root site. It is always live and always exists. */
export async function rootSite(): Promise<Site> {
  return getRootSite();
}

/** One sport, by the `[sport]` segment. 404s for anything that is not a live one. */
export async function sportSite(slug: string): Promise<Site> {
  const site = await getSiteBySlug(slug);

  // `kind` as well as existence: the root site's slug is `landing`, and
  // `/landing` must not be a second address for the home page.
  if (!site || site.kind !== "sport" || site.status !== "live") notFound();

  return site;
}

/** The same, plus "and this site has that module switched on". */
export function requireModule(site: Site, module: SiteModule): void {
  if (!hasModule(site, module)) notFound();
}
