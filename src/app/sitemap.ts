import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import { listDeckSummaries } from "@/lib/server/decksRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { trackSlug } from "@/lib/tracks";

/**
 * Add a line here when a new public page lands.
 *
 * The circuits are read from the table rather than listed by hand, because they
 * are added from the admin: a hand-written list would leave a new circuit out of
 * the sitemap until someone remembered this file.
 *
 * This runs at BUILD time, and it no longer swallows a database error: a build
 * that cannot reach Neon now fails instead of shipping a sitemap with every
 * circuit and deck missing from it. That is the louder of the two failures on
 * purpose — a deploy that stops is noticed and retried, and a sitemap quietly
 * published with half the site absent is not.
 *
 * The registration forms at /register/<slug> are deliberately NOT here. Each one
 * sets `robots: noindex` — a form has nothing to rank for, and a closed one in a
 * search result is worse than nothing — so listing them would be asking a
 * crawler to fetch pages it is then told to forget.
 *
 * The decks at /deck/<slug> ARE here, and the difference is what they are: a
 * deck is published reading matter with nothing to submit and no closing date,
 * so it is worth finding. Only the published ones — a draft is not on the
 * internet at all — and the list comes from the table for the same reason the
 * circuits do.
 *
 * The articles at /articles/<slug> are here on the same argument as the decks,
 * only more so: an article is written to be read and to be found. Every published
 * one is listed whatever page it belongs to, because `page_key` decides who may
 * edit an article and never who may read it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tracks, decks, articles] = await Promise.all([
    listTracks(),
    listDeckSummaries(),
    listPublishedArticles(),
  ]);

  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/incrc`,
      lastModified: now,
      // The championship's dates and venues are set for the season; only the
      // round results would move, and those are not on this page yet.
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE.url}/circuits`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...tracks.map((track) => ({
      url: `${SITE.url}/circuits/${trackSlug(track)}`,
      lastModified: now,
      // A circuit's record changes when a lap record falls, which is a handful
      // of times a season at most.
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    ...decks.map((deck) => ({
      url: `${SITE.url}/deck/${deck.slug}`,
      lastModified: now,
      // A deck is a document. Once it is published its pages are replaced
      // wholesale or not at all.
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    {
      url: `${SITE.url}/articles`,
      lastModified: now,
      // The index gains a card whenever anything is published.
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...articles.map((article) => ({
      url: `${SITE.url}/articles/${article.slug}`,
      lastModified: now,
      // Written once and corrected, not rewritten. The index above is where a
      // crawler finds the new ones.
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
