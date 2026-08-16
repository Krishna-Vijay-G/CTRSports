"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventHref, eventName, type EventSummary } from "@/lib/events";
import { eventDateLabel, eventDateParts, eventIsPast, nextEventIndex } from "@/lib/raceDates";
import { findTrack, type Track } from "@/lib/tracks";
import type { SiteRef } from "@/lib/sites";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { Media } from "@/components/ui/Media";

/**
 * The season as a list, on its own page.
 *
 * Not the calendar BAND. The band is a strip on the home page and is built to be
 * scanned in one glance from a grid of four; this is the page somebody arrives
 * at wanting the whole season, so it is one row per event with room for the
 * subtitle and the venue beside the date.
 *
 * A client component for one reason, the same one the band has: which event is
 * "next" is a fact about the clock, and reading the clock during render would
 * bake an answer into a statically generated page that rots the moment the
 * weekend passes. Until the browser has read it, nothing is marked — correct
 * markup, no layout jump.
 */
export function SeasonList({
  site,
  events,
  tracks,
}: {
  site: SiteRef;
  events: readonly EventSummary[];
  tracks: Track[];
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const next = now ? nextEventIndex(events, now) : -1;

  return (
    <ol className="mt-10 space-y-3">
      {events.map((event, index) => (
        <li key={event.id}>
          <Reveal delay={Math.min(index, 8) * 0.04}>
            <Row
              site={site}
              event={event}
              track={findTrack(tracks, event.track_id)}
              past={eventIsPast(event, now)}
              current={index === next}
            />
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

function Row({
  site,
  event,
  track,
  past,
  current,
}: {
  site: SiteRef;
  event: EventSummary;
  track: Track | undefined;
  past: boolean;
  current: boolean;
}) {
  const date = eventDateParts(event);
  const name = eventName(event, track?.name);
  const where = track?.location || event.city;
  const cover = event.cover_image || track?.photo_url || "";

  return (
    <article
      className={cn(
        "group relative flex items-stretch gap-4 overflow-hidden rounded-card border bg-panel transition-colors sm:gap-6",
        current ? "border-accent/60" : "border-line hover:border-accent/40",
        past && "opacity-60"
      )}
    >
      {/* The date block, on its own ground so the days line up down the page —
          which is the whole reason a season is set this way. */}
      <div className="flex w-[92px] shrink-0 flex-col items-center justify-center border-r border-line/60 bg-surface/40 px-2 py-5 sm:w-[112px]">
        {date ? (
          <>
            <span className="font-display text-2xl font-extrabold leading-none tracking-[-0.02em] text-fg sm:text-3xl">
              {date.days}
            </span>
            <span className="mt-1 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent">
              {date.month}
            </span>
            <span className="text-[11px] font-semibold text-fg-faint">{date.year}</span>
          </>
        ) : (
          <span className="text-center font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-fg-faint">
            Date TBC
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-4 pr-4 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          {event.round ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">
              {event.round}
            </span>
          ) : null}
          {current ? (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">
              Next
            </span>
          ) : past ? (
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">
              Done
            </span>
          ) : null}
          {event.badge && !past ? (
            <span className="text-[11px] font-semibold text-fg-faint">{event.badge}</span>
          ) : null}
        </div>

        {/* after:inset-0 makes the whole row clickable without nesting anchors. */}
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-fg sm:text-lg">
          <Link
            href={eventHref(site, event)}
            className="transition-colors after:absolute after:inset-0 hover:text-accent"
          >
            {name}
          </Link>
        </h2>

        {event.subtitle ? (
          <p className="mt-1 line-clamp-1 text-[13px] text-fg-muted">{event.subtitle}</p>
        ) : null}

        <p className="mt-1 text-[13px] text-fg-faint">
          {[where, eventDateLabel(event)].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* The photograph last, and hidden on a phone: at 360px it would be a
          40px sliver that tells nobody anything. */}
      {cover ? (
        <div className="hidden w-40 shrink-0 overflow-hidden sm:block lg:w-56">
          <Media
            src={cover}
            alt=""
            aria-hidden
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              past && "grayscale"
            )}
          />
        </div>
      ) : null}
    </article>
  );
}
