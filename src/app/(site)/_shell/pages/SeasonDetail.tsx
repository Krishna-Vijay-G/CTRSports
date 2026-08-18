import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { calendarHref, eventHref, eventName } from "@/lib/events";
import { eventDateLabel } from "@/lib/raceDates";
import { seasonHref, type SeasonSummary } from "@/lib/seasons";
import { listPublishedEvents } from "@/lib/server/eventsRepo";
import { getSeasonBySlug, listPublishedSeasons } from "@/lib/server/seasonsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { findTrack } from "@/lib/tracks";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { Media } from "@/components/ui/Media";
import { SeasonList } from "../calendar/SeasonList";
import { SiteShell } from "../SiteShell";

/**
 * One season, at `/<sport>/calendar/<slug>` — usually just the year.
 *
 * This is what migration 0021 bought. Every round used to hang off the sport, so
 * "the calendar" was however many rounds had ever been entered: the January
 * after go-live, next year's four would have joined this year's four on one
 * page, under a heading naming whichever year somebody last typed.
 *
 * ── The same route as a round ─────────────────────────────────────────────
 *
 * `/incrc/calendar/2026` and `/incrc/calendar/round-01` are one route reading
 * two tables, which is why a season and a round of one sport may never share an
 * address — see calendarSlugs.ts. The route asks for a season first and falls
 * through to the event page, so the cost of the sharing is one indexed lookup
 * on a round's page and nothing at all on a season's.
 *
 * ── Three states, the same three every addressed record here has ──────────
 *
 *   missing or draft   404. A draft is not on the internet.
 *   a former address   a permanent redirect, so a printed link corrects itself.
 *   no rounds yet      the season, and a line saying so. A championship that has
 *                      announced next year without dating it is a real state,
 *                      and it is worth a page.
 */

export async function seasonMetadata(site: Site, slug: string): Promise<Metadata> {
  const season = await getSeasonBySlug(site.id, slug).catch(() => null);
  if (!season || season.status !== "published") return { title: "Not found" };

  const events = (await listPublishedEvents(site.id).catch(() => [])).filter(
    (event) => event.season_id === season.id
  );

  const title = season.name || "Calendar";
  const description =
    season.subtitle ||
    (events.length
      ? `${events.length} ${events.length === 1 ? "round" : "rounds"}${range(events)}`
      : "The season, as it is announced.");

  return {
    title,
    description,
    alternates: { canonical: seasonHref(site, season) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${seasonHref(site, season)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
      ...(season.cover_image && season.cover_image.startsWith("http")
        ? { images: [{ url: season.cover_image }] }
        : {}),
    },
  };
}

export async function SeasonDetail({ site, slug }: { site: Site; slug: string }) {
  // The throwing loader, for the reason the circuit page gives: a database that
  // is down must be a 500, not a 404 a crawler will believe.
  const season = await getSeasonBySlug(site.id, slug);

  if (!season || season.status !== "published") notFound();
  if (season.slug !== slug) permanentRedirect(seasonHref(site, season));

  const [all, tracks, seasons] = await Promise.all([
    listPublishedEvents(site.id),
    listTracks(site.id),
    listPublishedSeasons(site.id),
  ]);

  const events = all.filter((event) => event.season_id === season.id);
  const others = seasons.filter((entry) => entry.id !== season.id);

  /*
   * An `ItemList` of `SportsEvent`s, each with the dates it actually has.
   *
   * The home page emits a `SportsEvent` for the championship with these as
   * `subEvent`. This is the same season said the other way round — as a list
   * whose items have their own addresses — which is what makes an individual
   * weekend eligible for the dated-event treatment in a search result.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: season.name || "Calendar",
    itemListElement: events.map((event, index) => {
      const track = findTrack(tracks, event.track_id);

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SportsEvent",
          name: eventName(event, track?.name),
          url: `${SITE.url}${eventHref(site, event)}`,
          eventStatus: "https://schema.org/EventScheduled",
          ...(event.date_from ? { startDate: event.date_from } : {}),
          ...(event.date_to || event.date_from
            ? { endDate: event.date_to || event.date_from }
            : {}),
          ...(event.cover_image || track?.photo_url
            ? { image: event.cover_image || track?.photo_url }
            : {}),
          location: {
            "@type": "Place",
            name: track?.name || event.venue,
            address: {
              "@type": "PostalAddress",
              addressLocality: track?.location || event.city,
              addressCountry: "IN",
            },
          },
        },
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteShell site={site} year={new Date().getFullYear()}>
        <section className="shell py-10 sm:py-14">
          <Reveal>
            <Link href={calendarHref(site)} className="pill-label hover:text-accent">
              Calendar
            </Link>
            <h1 className="headline mt-4 text-[clamp(1.9rem,4.5vw,3.2rem)]">
              {season.name || "The season"}
            </h1>
            {season.subtitle ? (
              <p className="body-copy mt-4 max-w-2xl">{season.subtitle}</p>
            ) : null}
            {events.length > 0 ? (
              <p className="body-copy mt-4 max-w-2xl">
                {events.length} {events.length === 1 ? "round" : "rounds"}
                {range(events)}
              </p>
            ) : null}
          </Reveal>

          {season.cover_image ? (
            <Reveal delay={0.05} className="relative mt-8">
              <Media
                src={season.cover_image}
                alt=""
                aria-hidden
                controls
                className="aspect-[16/7] w-full rounded-card object-cover"
              />
            </Reveal>
          ) : null}

          {events.length === 0 ? (
            <div className="panel-card mx-auto mt-10 max-w-2xl p-8 text-center sm:p-10">
              <p className="body-copy">
                The rounds have not been announced yet. Please check back.
              </p>
            </div>
          ) : (
            <SeasonList site={site} events={events} tracks={tracks} />
          )}

          {others.length > 0 ? <OtherSeasons site={site} seasons={others} /> : null}
        </section>
      </SiteShell>
    </>
  );
}

/**
 * Every other season, at the foot.
 *
 * The reason `/<sport>/calendar` can redirect to whichever season is running
 * rather than being an index page in its own right: the archive is HERE, one
 * click from the season anybody actually arrived for, instead of being a page
 * that exists to be passed through.
 */
function OtherSeasons({ site, seasons }: { site: Site; seasons: readonly SeasonSummary[] }) {
  return (
    <Reveal className="mt-14 border-t border-line pt-8">
      <h2 className="pill-label">Other seasons</h2>

      <ul className="mt-4 flex flex-wrap gap-2.5">
        {seasons.map((season) => (
          <li key={season.id}>
            <Link
              href={seasonHref(site, season)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-fg transition hover:border-accent hover:text-accent"
            >
              {season.name || season.slug}
              <span aria-hidden>&rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/**
 * ", from 11 September to 13 December 2026" — or nothing.
 *
 * Read off the first and last rounds that HAVE dates rather than off the list's
 * ends, because a season often announces its opener before its finale and a
 * range ending in a blank is worse than no range.
 */
function range(events: readonly { date_from: string; date_to: string; dates: string }[]) {
  const dated = events.filter((event) => event.date_from);
  if (dated.length === 0) return ".";

  const from = eventDateLabel({ ...dated[0], dates: "" });
  const last = dated[dated.length - 1];
  const to = eventDateLabel({ date_from: last.date_to || last.date_from, date_to: "", dates: "" });

  return from === to ? `, ${from}.` : `, from ${from} to ${to}.`;
}
