import type { ReactNode } from "react";
import { listSites } from "@/lib/server/sitesRepo";
import { sportSite } from "../_shell/site";

/**
 * Everything served under a sport.
 *
 * The layout draws nothing — the card and the chrome are `SiteShell`, which is a
 * component because it needs props a layout cannot take. What this is for is the
 * one job a layout is right for: refusing an unknown or unpublished sport ONCE
 * for the whole subtree, so `/nonsense/deck/anything` is a 404 before any page
 * below it runs a query.
 *
 * Every page under here calls `sportSite` too. That is not belt and braces for
 * its own sake: a page has to have the site to do anything, and a page that is
 * safe on its own cannot be broken by somebody later moving a file out from
 * under this layout. Both calls are the same cached read.
 */
export default async function SportLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sport: string }>;
}) {
  await sportSite((await params).sport);
  return children;
}

/**
 * The sports to build at deploy time.
 *
 * Only the live ones, which is the same list `sportSite` will serve. A sport
 * created after the build is still reachable — the pages below are revalidating
 * rather than static-only, so Next renders it on the first request and caches it
 * from there. This just means the ones that exist today are ready on the first
 * hit rather than the second.
 */
export async function generateStaticParams() {
  const sites = await listSites();

  return sites
    .filter((site) => site.kind === "sport" && site.status === "live")
    .map((site) => ({ sport: site.slug }));
}
