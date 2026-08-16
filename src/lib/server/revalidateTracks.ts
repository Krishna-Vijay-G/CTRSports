import "server-only";

import { revalidatePath } from "next/cache";
import { siteHref, type SiteRef } from "@/lib/sites";
import { circuitsHref } from "@/lib/tracks";

/**
 * Every cached page a circuit appears on.
 *
 * Four routes read ctr.tracks, and all four are cached — so a circuit saved in
 * the console would otherwise sit invisible for up to the revalidate window on
 * pages the editor never thinks about. Listing them in one place is what stops
 * the next route that reads a circuit being the one nobody remembers to clear.
 *
 * The detail route is cleared by its route PATTERN, not by one slug: a rename
 * changes the slug, so the page that has to be thrown away is the OLD address,
 * which the handler no longer has. `"page"` on the bracket path invalidates
 * every rendered slug of that route, which covers both.
 *
 * That pattern is the literal route file's path — `/[sport]/circuits/[slug]`
 * for a sport, `/circuits/[slug]` for the root — and NOT the site's own URL. A
 * pattern is matched against the route tree, so `/incrc/circuits/[slug]` would
 * match nothing and clear nothing.
 */
export function revalidateTrackPages(site: SiteRef): void {
  revalidatePath(siteHref(site) || "/"); // the calendar draws circuits
  revalidatePath(circuitsHref(site));
  revalidatePath(
    site.kind === "root" ? "/circuits/[slug]" : "/[sport]/circuits/[slug]",
    "page"
  );
  revalidatePath("/sitemap.xml");
}
