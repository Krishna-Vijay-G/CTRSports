import "server-only";

import { cache } from "react";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import { listDeckSummaries } from "@/lib/server/decksRepo";
import { listFormsForSite } from "@/lib/server/formsRepo";
import { currentPublishedSeason } from "@/lib/server/seasonsRepo";
import { listVisibleSports, listAllSports } from "@/lib/server/sportsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { metaOf, type Section } from "@/lib/sections/document";
import type { Site } from "@/lib/sites";
import type { SectionRecords } from "@/lib/sections/types";

/**
 * Everything a page's sections might need that is not their own stored value,
 * fetched once.
 *
 * Five lists and the page's own identity, in one shape, for every page there
 * will ever be. A section never fetches for itself — that is the rule that lets
 * the console preview render the real components from an unsaved draft — so
 * whatever any of them might want has to be gathered here, by the route.
 *
 * ── Why the whole bundle, every time ──────────────────────────────────────
 *
 * A page's sections are data, so which lists it needs is not known until it has
 * been read, and reading it to decide what else to read is a round trip in
 * series. Five parallel queries against a site's own rows is cheaper than that,
 * and each of them is `cache()`d for the request anyway — a route that also
 * renders a deck list pays for it once.
 *
 * ── The season, not the sport's whole history ─────────────────────────────
 *
 * `currentPublishedSeason` returns the season a visitor has arrived in and its
 * rounds, so the calendar band draws one year rather than every year there has
 * ever been. It reads the two published lists, both `cache()`d, so it costs
 * nothing over fetching the events directly.
 */
export const getRecords = cache(
  async (site: Site, sections: readonly Section[]): Promise<SectionRecords> => {
    const [tracks, forms, decks, articles, current, sports] = await Promise.all([
      listTracks(site.id),
      listFormsForSite(site.id),
      listDeckSummaries(site.id),
      listPublishedArticles(site.id),
      currentPublishedSeason(site.id),
      listVisibleSports(),
    ]);

    return {
      site,
      tracks,
      forms,
      decks,
      articles,
      season: current?.season ?? null,
      events: current?.events ?? [],
      sports,
      meta: metaOf(sections),
    };
  }
);

/**
 * The same, for the console.
 *
 * One difference, and it is the reason this is not a flag on the function
 * above: the sports cards come back INCLUDING the hidden ones, because the
 * console edits them and a card switched off still has to be on screen to be
 * switched back on. Everything else is the same set the public page draws.
 */
export const getEditorRecords = cache(
  async (site: Site, sections: readonly Section[]): Promise<SectionRecords> => {
    const [tracks, forms, decks, articles, current, sports] = await Promise.all([
      listTracks(site.id),
      listFormsForSite(site.id),
      listDeckSummaries(site.id),
      listPublishedArticles(site.id),
      currentPublishedSeason(site.id),
      listAllSports(),
    ]);

    return {
      site,
      tracks,
      forms,
      decks,
      articles,
      season: current?.season ?? null,
      events: current?.events ?? [],
      sports,
      meta: metaOf(sections),
    };
  }
);
