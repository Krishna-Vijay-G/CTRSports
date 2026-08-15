import "server-only";

import { revalidatePath } from "next/cache";

/**
 * The pages that draw an article, cleared after one changes.
 *
 * `/articles` is the index. A new article has to appear on it, and one
 * unpublished or renamed has to stop being offered under the old title.
 *
 * `/articles/<slug>` is the article itself, cached for a minute like the rest of
 * the public site. The OLD address is cleared as well as the new one, because
 * after a rename the stale copy sits under the address that is now a redirect —
 * so anybody on the old link would keep getting the pre-rename page instead of
 * being sent to the new one.
 *
 * The same shape `revalidateDeckPages` uses, and for the same reason: one list, so
 * a route that changes an article cannot forget one of the pages that shows it.
 */
export function revalidateArticlePages(slugs: readonly string[] = []): void {
  revalidatePath("/articles");

  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/articles/${slug}`);
  }
}
