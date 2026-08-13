import "server-only";

import { revalidatePath } from "next/cache";

/**
 * The pages that draw forms, cleared after a form changes.
 *
 * Two things are deliberately absent.
 *
 * `/register/[slug]` — it is `force-dynamic`, because a form flipped to closed
 * has to be closed on the very next request. There is no cached copy to clear.
 *
 * `/sitemap.xml` — forms are not in it. Each one is `noindex`, so listing them
 * would be asking a crawler to fetch a page it is then told to forget.
 *
 * The same helper shape `revalidateTracks.ts` uses, and for the same reason —
 * one list, so a route that changes a form cannot forget one of the pages that
 * shows it.
 */
export function revalidateFormPages(): void {
  revalidatePath("/incrc"); // the registrations cards and the entry band's button
  revalidatePath("/"); // the landing page's call-to-action band
}
