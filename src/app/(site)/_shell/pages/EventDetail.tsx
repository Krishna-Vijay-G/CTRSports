import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { calendarHref, eventHref, eventName, eventNumber } from "@/lib/events";
import { formHref, formState } from "@/lib/forms";
import { eventDateLabel, eventIsPast } from "@/lib/raceDates";
import { richTextIsEmpty, richTextWords } from "@/lib/richtext";
import { getEventBySlug } from "@/lib/server/eventsRepo";
import { listFormsForSite } from "@/lib/server/formsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { findTrack, trackHref } from "@/lib/tracks";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { PinIcon } from "@/lib/sections/shared/icons";
import { ArticleBody } from "../articles/ArticleBody";
import { SiteShell } from "../SiteShell";
import { Media } from "@/components/ui/Media";

/**
 * One event, at its own address.
 *
 * This is what migration 0018 bought. A round of the season used to be a
 * position in a list inside the calendar band, so the card could only ever link
 * to the CIRCUIT — a place, which says nothing about who is racing, when entries
 * close, or what happened.
 *
 * ── Three states, the same three a deck and an article have ───────────────
 *
 *   missing or draft   404. A draft is not on the internet, and "this exists
 *                      but you cannot see it" is a way of putting it there.
 *   a former address   a permanent redirect to the current one, so a printed
 *                      link or a QR code corrects itself rather than dying.
 *   nothing written    the details and no report. Unlike an article, that is
 *                      the NORMAL state of an event before it happens — the
 *                      dates, the circuit and the entry link are the page, and
 *                      the writing comes afterwards.
 *
 * An event belongs to a site and is served under it. Asking for one under the
 * wrong sport is a 404, not a redirect: the two are different addresses for
 * different things.
 *
 * Cached for a minute like the rest of the public site, and cleared on write —
 * see revalidateEvents.ts.
 */

export async function eventMetadata(site: Site, slug: string): Promise<Metadata> {
  const event = await getEventBySlug(site.id, slug).catch(() => null);

  if (!event || event.status !== "published") return { title: "Not found" };

  const tracks = await listTracks(site.id);
  const track = findTrack(tracks, event.track_id);

  const title = eventName(event, track?.name) || "Event";
  // What it is and when, before anything anybody wrote — a search result for a
  // race weekend wants the date more than it wants the opening sentence.
  const when = eventDateLabel(event);
  const description =
    event.subtitle ||
    [when, track?.location || event.city].filter(Boolean).join(", ") ||
    richTextWords(event.body) ||
    title;
  const cover = event.cover_image || track?.photo_url || "";

  return {
    title,
    description,
    alternates: { canonical: eventHref(site, event) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${eventHref(site, event)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
      // Only when it is an absolute address: a cover can be a /public path, and
      // a relative URL in a card preview resolves against the crawler's own host.
      ...(cover && cover.startsWith("http") ? { images: [{ url: cover }] } : {}),
    },
  };
}

export async function EventDetail({ site, slug }: { site: Site; slug: string }) {
  // The throwing loader, for the reason the circuit page gives: a database that
  // is down must be a 500, not a 404 a crawler will believe.
  const event = await getEventBySlug(site.id, slug);

  if (!event || event.status !== "published") notFound();
  if (event.slug !== slug) permanentRedirect(eventHref(site, event));

  const [tracks, forms] = await Promise.all([listTracks(site.id), listFormsForSite(site.id)]);

  const track = findTrack(tracks, event.track_id);
  const name = eventName(event, track?.name);
  const where = track?.location || event.city;
  const cover = event.cover_image || track?.photo_url || "";
  const when = eventDateLabel(event);

  /*
   * The entry form, and only while it is taking entries.
   *
   * `formState` weighs the status, the opening and closing times and the cap
   * together — the same answer the form's own page and the submit route give. A
   * closed form is not linked from here: somebody arriving on a poster three
   * months late is better served by the report than by a button that refuses
   * them.
   */
  const form = forms.find((entry) => entry.id === event.form_id);
  const open = form && formState(form, form.entries) === "open" ? form : null;

  // Read on the server, unlike the calendar band's — this one is not a countdown
  // and does not have to stay right in a tab left open overnight, so a static
  // page may carry it and be re-rendered by the revalidate window like the rest.
  const past = eventIsPast(event, new Date());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    url: `${SITE.url}${eventHref(site, event)}`,
    eventStatus: "https://schema.org/EventScheduled",
    ...(event.subtitle ? { description: event.subtitle } : {}),
    ...(event.date_from ? { startDate: event.date_from } : {}),
    ...(event.date_to || event.date_from
      ? { endDate: event.date_to || event.date_from }
      : {}),
    ...(cover ? { image: cover } : {}),
    location: {
      "@type": "Place",
      name: track?.name || event.venue,
      ...(track ? { url: `${SITE.url}${trackHref(site, track)}` } : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: where,
        addressCountry: "IN",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteShell site={site} year={new Date().getFullYear()}>
        <article className="shell py-10 sm:py-14">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={calendarHref(site)} className="pill-label hover:text-accent">
                Calendar
              </Link>
              {eventNumber("", event) ? (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-fg-faint">
                  {event.round}
                </span>
              ) : null}
              {past ? (
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">
                  Completed
                </span>
              ) : event.badge ? (
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">
                  {event.badge}
                </span>
              ) : null}
            </div>

            <h1 className="headline mt-4 text-[clamp(1.9rem,4.5vw,3.2rem)]">{name}</h1>
            {event.subtitle ? <p className="body-copy mt-4 max-w-2xl">{event.subtitle}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
              {when ? <span className="font-semibold text-fg">{when}</span> : null}
              {where ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-accent">
                    <PinIcon />
                  </span>
                  {where}
                </span>
              ) : null}
              {track?.length ? <Spec label="Length" value={track.length} /> : null}
              {track?.turns ? <Spec label="Turns" value={track.turns} /> : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {open ? (
                <Link
                  href={formHref(site, open)}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-ink transition hover:bg-accent/90"
                >
                  Enter this event
                  <span aria-hidden>&rarr;</span>
                </Link>
              ) : null}
              {track ? (
                <Link
                  href={trackHref(site, track)}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold text-fg transition hover:border-accent hover:text-accent"
                >
                  Circuit guide
                  <span aria-hidden>&rarr;</span>
                </Link>
              ) : null}
            </div>
          </Reveal>

          {/* `relative` on the Reveal so the sound button has something to sit
              in. Nothing else about it changes. */}
          {cover ? (
            <Reveal delay={0.05} className="relative mt-8">
              <Media
                src={cover}
                alt=""
                aria-hidden
                sound
                className="aspect-[16/7] w-full rounded-card object-cover"
              />
            </Reveal>
          ) : null}

          {/*
            An event with nothing written is the ordinary state before the
            weekend, not a half-finished page — so unlike an article there is no
            apology here. The details above ARE the page until somebody writes
            the report.
          */}
          {richTextIsEmpty(event.body) ? null : (
            <ArticleBody doc={event.body} className="mt-10" />
          )}
        </article>
      </SiteShell>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-faint">
        {label}
      </span>
      <span className="font-display font-bold text-fg">{value}</span>
    </span>
  );
}
