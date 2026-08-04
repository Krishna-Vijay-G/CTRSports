import "server-only";

import type { Metadata } from "next";
import type { MediaPost } from "@/lib/posts";
import { listPublishedPosts } from "@/lib/server/postsRepo";
import { SPORTS, type SportId } from "@/lib/sports";

/**
 * The two pieces every public posts page needs — the four `/{slug}/post` routes
 * and the landing page, which is just the `main` vertical.
 *
 * See BUILT_SPORT_PAGES in src/lib/sports.ts for which sports have a page.
 */

export function sportPostMetadata(id: SportId): Metadata {
  const sport = SPORTS[id];
  return {
    title: `${sport.name} — ${sport.team} | CTR Unified`,
    description: sport.tagline,
  };
}

/** Never throws: an unreachable database means a page with no posts, not a 500. */
export async function loadPosts(sport: SportId): Promise<MediaPost[]> {
  try {
    return await listPublishedPosts(sport);
  } catch (error) {
    console.error(`[${sport}] could not load posts`, error);
    return [];
  }
}
