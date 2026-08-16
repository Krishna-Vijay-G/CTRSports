import "server-only";

import { revalidatePath } from "next/cache";
import { siteHref, type SiteRef } from "@/lib/sites";

/**
 * Every cached page of one site, cleared.
 *
 * The chrome is the only thing that needs this. A band belongs to one page and a
 * deck to one address, but the header and the footer are drawn around every
 * route a site serves — so a footer address corrected in the console has to
 * reach the deck pages, the articles, the circuits and the entry forms at the
 * same moment it reaches the home page. Clearing only the home page would leave
 * the old telephone number on every other page of the site until each of them
 * happened to expire, which is the worst kind of cache miss: the fix looks like
 * it worked.
 *
 * ── The two shapes, and why the second is broader than it looks ───────────
 *
 * The routes are cleared by their PATTERN, which is the literal path of the
 * route FILE — `/[sport]/deck/[slug]`, not `/incrc/deck/world-of-ctr`. A pattern
 * is matched against the route tree, so a site's own URL would match nothing and
 * clear nothing; that is the lesson `revalidateTracks` records.
 *
 * For the root site each pattern names exactly its own pages, because the root
 * has a route tree to itself. For a sport it names EVERY sport's — there is one
 * `/[sport]/deck/[slug]` file and every sport is served by it, so clearing
 * INCRC's decks clears Pickleball's too.
 *
 * That is over-broad and it is the right trade. The alternative is to enumerate
 * this site's decks, articles, circuits and forms and clear each concrete
 * address — four queries and a list that is stale the moment a record is added
 * — to save re-rendering a handful of other sports' pages after an act that
 * happens a few times in the life of a site. Being honest about it in a comment
 * costs less than being clever about it in code.
 *
 * The site's home page is the one thing cleared by its real address rather than
 * a pattern, because it HAS one: `/` or `/incrc`, no dynamic segment in it.
 */
export function revalidateSitePages(site: SiteRef): void {
  revalidatePath(siteHref(site) || "/");

  const base = site.kind === "root" ? "" : "/[sport]";

  for (const route of [
    "/articles",
    "/articles/[slug]",
    "/circuits",
    "/circuits/[slug]",
    "/deck/[slug]",
    "/register/[slug]",
  ]) {
    revalidatePath(`${base}${route}`, "page");
  }
}
