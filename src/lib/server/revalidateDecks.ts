import "server-only";

import { revalidatePath } from "next/cache";

/**
 * The pages that draw a deck, cleared after one changes.
 *
 * Two of them, and they are cleared for different reasons:
 *
 * `/deck/<slug>` is the deck itself, cached for a minute like the rest of the
 * public site. A deck is fifty images; making that page dynamic to catch an
 * edit nobody has made would be paying for it on every view. So it is cached
 * and cleared here instead — which needs the OLD address as well as the new
 * one, because after a rename the stale copy sits under the address that is now
 * a redirect.
 *
 * `/incrc` carries the cards. A deck renamed or unpublished has to stop being
 * offered there, and the card's title and cover come from the deck's own row.
 *
 * The same shape `revalidateFormPages` uses, and for the same reason: one list,
 * so a route that changes a deck cannot forget one of the pages that shows it.
 */
export function revalidateDeckPages(slugs: readonly string[] = []): void {
  revalidatePath("/incrc");

  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/deck/${slug}`);
  }
}
