import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { calendarHref, eventHref, eventName } from "@/lib/events";
import { eventDateLabel } from "@/lib/raceDates";
import { listPublishedEvents } from "@/lib/server/eventsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { findTrack } from "@/lib/tracks";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { SeasonList } from "../calendar/SeasonList";
import { SiteShell } from "../SiteShell";

/**
 * The whole season, at `/<sport>/calendar`.
 *
 * The home page's calendar band shows the same events and is built to be glanced
 * at from a grid of four; this is where somebody who wants the season goes. It
 * exists for the reason the circuits index exists: the band belongs to a page,
 * and the season does not.
 *
 * This sport's events, and only this sport's. An unreachable database renders
 * the error boundary rather than an empty season, which would read as "nobody is
 * racing" instead of as the outage it is.
 */

export async function calendarMetadata(site: Site): Promise<Metadata> {
  const events = await listPublishedEvents(site.id);

  const title = "Calendar";
  const description = events.length
    ? `${events.length} ${events.length === 1 ? "event" : "events"}: ${events
        .map((event) => eventName(event, "") || event.venue)
        .filter(Boolean)
        .slice(0, 6)
        .join(", ")}.`
    : "The season, as it is announced.";

  return {
    title,
    description,
    alternates: { canonical: calendarHref(site) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${calendarHref(site)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export async function CalendarIndex({ site }: { site: Site }) {
  const [events, tracks] = await Promise.all([
    listPublishedEvents(site.id),
    listTracks(site.id),
  ]);

  /*
   * An `ItemList` of `SportsEvent`s, each with the dates it actually has.
   *
   * The home page already emits a `SportsEvent` for the championship with these
   * as `subEvent`. This is the same season said the other way round — as a list
   * whose items have their own addresses — which is what makes an individual
   * weekend eligible for the dated-event treatment in a search result.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Calendar",
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
            <span className="pill-label">Calendar</span>
            <h1 className="headline mt-4 text-[clamp(1.9rem,4.5vw,3.2rem)]">The season</h1>
            {events.length > 0 ? (
              <p className="body-copy mt-4 max-w-2xl">
                {events.length} {events.length === 1 ? "event" : "events"}
                {firstAndLast(events)}
              </p>
            ) : null}
          </Reveal>

          {events.length === 0 ? (
            <div className="panel-card mx-auto mt-10 max-w-2xl p-8 text-center sm:p-10">
              <p className="body-copy">The season has not been announced yet. Please check back.</p>
            </div>
          ) : (
            <SeasonList site={site} events={events} tracks={tracks} />
          )}
        </section>
      </SiteShell>
    </>
  );
}

/**
 * ", from 11 September to 13 December 2026" — or nothing.
 *
 * Read off the first and last events that HAVE dates rather than off the list's
 * ends, because a season often announces its opener before its finale and a
 * range ending in a blank is worse than no range.
 */
function firstAndLast(events: readonly { date_from: string; date_to: string; dates: string }[]) {
  const dated = events.filter((event) => event.date_from);
  if (dated.length === 0) return ".";

  const from = eventDateLabel({ ...dated[0], dates: "" });
  const last = dated[dated.length - 1];
  const to = eventDateLabel({ date_from: last.date_to || last.date_from, date_to: "", dates: "" });

  return from === to ? `, ${from}.` : `, from ${from} to ${to}.`;
}
