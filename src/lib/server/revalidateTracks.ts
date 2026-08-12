import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Every cached page a circuit appears on.
 *
 * Four routes read ctr_tracks, and all four are cached — so a circuit saved in
 * the admin would otherwise sit invisible for up to the revalidate window on
 * pages the editor never thinks about. Listing them in one place is what stops
 * the next route that reads a circuit being the one nobody remembers to clear.
 *
 * The detail route is cleared by its route pattern, not by one slug: a rename
 * changes the slug, so the page that has to be thrown away is the OLD address,
 * which the handler no longer has. `"page"` on the bracket path invalidates
 * every rendered slug of that route, which covers both.
 */
export function revalidateTrackPages(): void {
  revalidatePath("/incrc"); // the calendar draws circuits
  revalidatePath("/circuits");
  revalidatePath("/circuits/[slug]", "page");
  revalidatePath("/sitemap.xml");
}
