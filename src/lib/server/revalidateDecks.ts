import "server-only";

import { revalidatePath } from "next/cache";
import { deckHref } from "@/lib/decks";
import { siteHref, type SiteRef } from "@/lib/sites";

/**
 * The pages that draw a deck, cleared after one changes.
 *
 * Two of them, and they are cleared for different reasons:
 *
 * The deck's own address is cached for a minute like the rest of the public
 * site. A deck is fifty images; making that page dynamic to catch an edit
 * nobody has made would be paying for it on every view. So it is cached and
 * cleared here instead — which needs the OLD address as well as the new one,
 * because after a rename the stale copy sits under the address that is now a
 * redirect.
 *
 * The site's home page carries the cards. A deck renamed or unpublished has to
 * stop being offered there, and a card's title and cover come from the deck's
 * own row.
 *
 * ── Why every path takes a site ───────────────────────────────────────────
 *
 * Because they are the site's paths. `/deck/<slug>` used to be the address;
 * `/incrc/deck/<slug>` is, and clearing the flat one would clear nothing at all
 * — silently, which is the worst way for a cache to be wrong.
 */
export function revalidateDeckPages(site: SiteRef, slugs: readonly string[] = []): void {
  revalidatePath(siteHref(site) || "/");

  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(deckHref(site, { slug }));
  }
}
