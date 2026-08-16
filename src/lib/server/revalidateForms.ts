import "server-only";

import { revalidatePath } from "next/cache";
import { siteHref, type SiteRef } from "@/lib/sites";

/**
 * The pages that draw forms, cleared after a form changes.
 *
 * The site's home page carries the registration cards and the entry band's
 * button. Nothing else cached reads a form.
 *
 * Two things are deliberately absent.
 *
 * The form's own page — it is `force-dynamic`, because a form flipped to closed
 * has to be closed on the very next request. There is no cached copy to clear.
 *
 * `/sitemap.xml` — forms are not in it. Each one is `noindex`, so listing them
 * would be asking a crawler to fetch a page it is then told to forget.
 */
export function revalidateFormPages(site: SiteRef): void {
  revalidatePath(siteHref(site) || "/");
}
