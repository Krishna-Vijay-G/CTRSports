import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { articleHref, articlesHref } from "@/lib/articles";
import { deckHref } from "@/lib/decks";
import { calendarHref, eventHref } from "@/lib/events";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import { listDeckSummaries } from "@/lib/server/decksRepo";
import { listPublishedEvents } from "@/lib/server/eventsRepo";
import { listSites } from "@/lib/server/sitesRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { hasModule, siteHref, type Site } from "@/lib/sites";
import { circuitsHref, trackHref } from "@/lib/tracks";

/**
 * Every public address, walked site by site.
 *
 * It used to be a hand-written list of the routes plus three queries. There is
 * no hand-written list any more: a site's addresses are its own address, plus
 * one branch per module it has switched on, plus a row for each of its records.
 * Adding a sport puts it in the sitemap; switching a module off takes its pages
 * out. Both without touching this file, which is the same argument the circuits
 * were read from the table for in the first place.
 *
 * Draft sites are left out. They 404 for visitors, and listing an address that
 * answers with a 404 is asking a crawler to distrust the whole file.
 *
 * This runs at BUILD time, and it does not swallow a database error: a build
 * that cannot reach Neon fails instead of shipping a sitemap with every circuit
 * and deck missing from it. That is the louder of the two failures on purpose —
 * a deploy that stops is noticed and retried, and a sitemap quietly published
 * with half the site absent is not.
 *
 * The registration forms are deliberately NOT here. Each one sets
 * `robots: noindex` — a form has nothing to rank for, and a closed one in a
 * search result is worse than nothing — so listing them would be asking a
 * crawler to fetch pages it is then told to forget.
 *
 * The decks ARE here, and the difference is what they are: a deck is published
 * reading matter with nothing to submit and no closing date, so it is worth
 * finding. Only the published ones — a draft is not on the internet at all. The
 * articles are here on the same argument, only more so: an article is written to
 * be read and to be found.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const sites = (await listSites()).filter((site) => site.status === "live");

  const perSite = await Promise.all(sites.map((site) => entriesFor(site, now)));
  return perSite.flat();
}

async function entriesFor(site: Site, now: Date): Promise<MetadataRoute.Sitemap> {
  const [tracks, decks, articles, events] = await Promise.all([
    hasModule(site, "circuits") ? listTracks(site.id) : [],
    hasModule(site, "decks") ? listDeckSummaries(site.id) : [],
    hasModule(site, "articles") ? listPublishedArticles(site.id) : [],
    hasModule(site, "events") ? listPublishedEvents(site.id) : [],
  ]);

  const at = (path: string) => `${SITE.url}${path}`;

  return [
    {
      // The site's own address. `siteHref` is "" for the root, and a sitemap
      // entry has to be a URL rather than the origin with nothing after it.
      url: at(siteHref(site) || "/"),
      lastModified: now,
      // The landing page changes when a sport is added; a championship page
      // changes when its season does.
      changeFrequency: site.kind === "root" ? "weekly" : "monthly",
      priority: site.kind === "root" ? 1 : 0.8,
    },

    ...(tracks.length > 0
      ? [
          {
            url: at(circuitsHref(site)),
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.7,
          },
        ]
      : []),
    ...tracks.map((track) => ({
      url: at(trackHref(site, track)),
      lastModified: now,
      // A circuit's record changes when a lap record falls, which is a handful
      // of times a season at most.
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),

    ...decks.map((deck) => ({
      url: at(deckHref(site, deck)),
      lastModified: now,
      // A deck is a document. Once it is published its pages are replaced
      // wholesale or not at all.
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),

    ...(articles.length > 0
      ? [
          {
            url: at(articlesHref(site)),
            lastModified: now,
            // The index gains a card whenever anything is published.
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    ...articles.map((article) => ({
      url: at(articleHref(site, article)),
      lastModified: now,
      // Written once and corrected, not rewritten. The index above is where a
      // crawler finds the new ones.
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    ...(events.length > 0
      ? [
          {
            url: at(calendarHref(site)),
            lastModified: now,
            // The season is announced once and then moves through itself, which
            // is a change to the page every time a weekend passes.
            changeFrequency: "weekly" as const,
            priority: 0.8,
          },
        ]
      : []),
    ...events.map((event) => ({
      url: at(eventHref(site, event)),
      lastModified: now,
      // Details before the weekend, a report after it. Twice in its life,
      // roughly — but both times matter, so not "yearly".
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
