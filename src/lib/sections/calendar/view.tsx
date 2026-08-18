"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventHref, eventName, eventNumber, type EventSummary } from "@/lib/events";
import {
  eventDateParts,
  eventIsPast,
  eventStart,
  nextEventIndex,
} from "@/lib/raceDates";
import { findTrack, trackHref, type Track } from "@/lib/tracks";
import type { SectionViewProps } from "@/lib/sections/types";
import type { SiteRef } from "@/lib/sites";
import type { Calendar } from "./model";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Countdown, CountdownLine } from "./Countdown";
import { PinIcon } from "@/lib/sections/shared/icons";
import { Media } from "@/components/ui/Media";

/**
 * The season, built the way every motorsport calendar worth copying is built.
 *
 * Three things carry it, all borrowed from the calendars people actually use —
 * Formula 1's season page above all:
 *
 *   the date block   days set large, month and year small beneath. A season is
 *                    read by scanning DOWN the days, so the day is the biggest
 *                    thing on the card and the month never repeats at that size.
 *   the photograph   the circuit itself, full bleed behind a scrim rather than
 *                    fitted into a tile. It is what makes one event look
 *                    different from the next at a glance.
 *   the next race    lifted out above the grid, at its own scale, with the clock
 *                    running. The rest of the season is a grid; the next event
 *                    is an event.
 *
 * Which one is "next" is decided by the clock, not by position: the first whose
 * last day has not passed. That has to happen in the browser — the server's
 * answer would be baked into a statically rendered page and would rot the moment
 * the weekend passed. Until it does, the first event leads: correct markup, no
 * layout jump, and no clock read during render.
 *
 * ── Where the season comes from ───────────────────────────────────────────
 *
 * `records.events` — the rounds of whichever season is running, in the order the
 * Rounds screen puts them in. Which season that is comes from the dates rather
 * than from a setting, so this band rolls over on its own the day the last
 * weekend of a year is run; `currentSeason` sets out how it is decided.
 *
 * The rounds used to be a list stored inside this section, which is what
 * migration 0018 undid: an event is a row with an address of its own now, so the
 * cards link to the EVENT rather than to the circuit it is held at. A circuit is
 * a place; a weekend is a thing that happens. 0021 then took the last editorial
 * decision out of the band — it drew every round the sport had ever had, which
 * was the same thing as the season only while there had been one.
 *
 * The circuit is still resolved, from `records.tracks`, because it is what
 * supplies the photograph, the length and the corner count. An event with no
 * circuit falls back to the venue and city typed on it, and simply has no
 * photograph.
 *
 * The words the cards are read with are the section's, not constants here. Each
 * blank simply leaves that piece off. The state badges are NOT among them:
 * "Next", "Done" and "Completed" are read off the clock rather than written by
 * anyone, and a field for a word the editor cannot change the meaning of is a
 * field that only ever goes stale.
 */
export function CalendarView({ value: calendar, records }: SectionViewProps<Calendar>) {
  const { tracks, site, events, season } = records;

  /*
   * The heading, with the season's own name behind it.
   *
   * A title typed here is a title somebody has to remember to change every
   * January — and "The 2026 Season" over next year's rounds is worse than no
   * heading at all. Left blank it takes the season's name, which changes with
   * the season because it IS the season. Typed, it wins: a championship whose
   * band says something other than the year should keep saying it.
   */
  const title = calendar.title || season?.name || "";

  // Null until the browser has read the clock. Nothing below may read it during
  // render; every time-dependent decision on this screen comes from here.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    // The season turns over once a weekend, so a slow tick is plenty — it is
    // here so a tab left open overnight still promotes the right event.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const next = now ? nextEventIndex(events, now) : -1;

  if (events.length === 0) {
    // A heading over an unannounced season is worth keeping — it says the
    // season exists. A heading nobody has written is not a section at all.
    if (!calendar.label && !title) return null;

    return (
      <section id="calendar" className="shell py-16 sm:py-20">
        <SectionHeading label={calendar.label} title={title} />
      </section>
    );
  }

  const leadIndex = next === -1 ? 0 : next;
  const lead = events[leadIndex];

  return (
    <section id="calendar" className="shell py-16 sm:py-20">
      <SectionHeading label={calendar.label} title={title} />

      <Reveal className="mt-10">
        <NextEvent
          site={site}
          event={lead}
          track={findTrack(tracks, lead.track_id)}
          isNext={next !== -1}
          words={calendar}
        />
      </Reveal>

      {/* The whole season stays in the list, the next event included, because
          the running order is the season and dropping one out of it to feature
          it above would leave a hole where round three should be. */}
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event, index) => (
          <li key={event.id} className="flex">
            <Reveal delay={index * 0.05} className="w-full">
              <EventCard
                site={site}
                event={event}
                track={findTrack(tracks, event.track_id)}
                past={eventIsPast(event, now)}
                current={index === leadIndex && next !== -1}
                words={calendar}
              />
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─────────────────────────── The next event ─────────────────────────── */

/**
 * The wording both cards read from — the calendar section itself.
 *
 * Passed whole rather than field by field: five props threaded through two
 * components is a signature nobody can read, and every one of them comes from
 * the same panel anyway.
 */
type Words = Calendar;

/**
 * The event. Full width, the circuit's photograph behind it, the clock running.
 */
function NextEvent({
  site,
  event,
  track,
  isNext,
  words,
}: {
  site: SiteRef;
  event: EventSummary;
  track: Track | undefined;
  isNext: boolean;
  words: Words;
}) {
  const start = eventStart(event);
  const date = eventDateParts(event);
  const name = eventName(event, track?.name);
  const where = track?.location || event.city;
  const cover = event.cover_image || track?.photo_url || "";

  const number = eventNumber(words.roundLabel, event);
  /* The pill says "Next round" when there is a word for it and the event's own
     number when there is not — the featured card must not lose its only heading
     because one field was left blank. */
  const badge = (isNext ? words.nextLabel : "") || number;
  /* The number beside the pill, and only when the pill is not already it. */
  const tail = isNext && number && number !== badge ? number : "";

  return (
    <article className="relative isolate overflow-hidden rounded-card border border-line bg-panel">
      {cover ? (
        <>
          <Media
            src={cover}
            alt=""
            aria-hidden
            controls
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          {/*
            Two layers, not one. The vertical wash lifts the copy off the photo;
            the horizontal one keeps the left side dark on wide screens, where
            the text sits over the part of the picture that is usually brightest.
          */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/80 to-black/40"
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/90 via-black/50 to-transparent lg:block"
          />
        </>
      ) : null}

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                {isNext ? (
                  <span
                    aria-hidden
                    className="block size-1.5 animate-pulse rounded-full bg-accent-ink"
                  />
                ) : null}
                {badge}
              </span>
            ) : null}

            {tail ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                {tail}
              </span>
            ) : null}

            {event.badge ? (
              <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/70">
                {event.badge}
              </span>
            ) : null}
          </div>

          {/* The date block: days large, everything else beneath at a whisper.
              A weekend with no date and no word for one draws no block at all,
              rather than an empty row holding a 24px margin open. */}
          {date || words.tbcLabel ? (
            <div className="mt-6 flex items-end gap-4">
              {date ? (
                <>
                  <span className="font-display text-[clamp(3rem,8vw,5.5rem)] font-extrabold leading-[0.85] tracking-[-0.03em] text-white">
                    {date.days}
                  </span>
                  <span className="pb-2">
                    <span className="block font-display text-xl font-extrabold uppercase leading-none tracking-[0.06em] text-accent sm:text-2xl">
                      {date.month}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white/50">
                      {date.year}
                    </span>
                  </span>
                </>
              ) : (
                <span className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold uppercase leading-none text-white/40">
                  {words.tbcLabel}
                </span>
              )}
            </div>
          ) : null}

          {/* The event's own page. Every event has one, so unlike the circuit
              link below this is not conditional on anything. */}
          <h3 className="headline mt-6 text-[clamp(1.5rem,3vw,2.25rem)] text-white">
            <Link href={eventHref(site, event)} className="transition-colors hover:text-accent">
              {name}
            </Link>
          </h3>

          {event.subtitle ? (
            <p className="mt-1.5 text-sm text-white/70">{event.subtitle}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/70">
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

          {/* Only when the event points at a circuit: one that carries only
              typed-in venue text has no circuit page to go to. Blank wording is
              the other way of switching this link off, for a season whose
              circuits have nothing worth reading on their own pages yet. */}
          {track && words.trackCtaLabel ? (
            <Link
              href={trackHref(site, track)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-[13px] font-semibold text-white transition hover:border-accent hover:text-accent"
            >
              {words.trackCtaLabel}
              <span aria-hidden>&rarr;</span>
            </Link>
          ) : null}
        </div>

        {/* The clock sits at the end of the row on a wide screen and under the
            copy on a narrow one, which is the only arrangement where it never
            competes with the date block for the eye. */}
        {start ? (
          <div className="shrink-0 lg:text-right">
            {/* One line for both states. It used to read "Lights out in" over
                the next event and "Starts in" otherwise, but "otherwise" is
                either the frame before the browser has read its clock or a
                season that has finished — neither is worth a second field. */}
            {words.countdownLabel ? (
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                {words.countdownLabel}
              </p>
            ) : null}
            <Countdown target={start} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

/* ──────────────────────────── The season ────────────────────────────── */

/** One event in the grid: photograph, date block, circuit, distance. */
function EventCard({
  site,
  event,
  track,
  past,
  current,
  words,
}: {
  site: SiteRef;
  event: EventSummary;
  track: Track | undefined;
  /** Decided by the parent from its one clock read, never here. */
  past: boolean;
  current: boolean;
  words: Words;
}) {
  const start = eventStart(event);
  const date = eventDateParts(event);
  const name = eventName(event, track?.name);
  const where = track?.location || event.city;
  const cover = event.cover_image || track?.photo_url || "";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card border bg-panel transition-all duration-300",
        current ? "border-accent/60" : "border-line hover:border-accent/40",
        past && "opacity-55 grayscale"
      )}
    >
      {/* The photograph, with the round number laid over it — the one place a
          card can carry a big numeral without fighting the date block. */}
      <div className="relative h-28 overflow-hidden bg-surface">
        {cover ? (
          <Media
            src={cover}
            alt=""
            aria-hidden
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}

        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent"
        />

        {words.roundLabel && event.round ? (
          <span className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
            {words.roundLabel}
          </span>
        ) : null}
        <span
          aria-hidden
          className="absolute bottom-2 left-4 font-display text-4xl font-extrabold leading-none text-white drop-shadow"
        >
          {event.round}
        </span>

        {current ? (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">
            Next
          </span>
        ) : past ? (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            Done
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-end gap-2">
          {date ? (
            <>
              <span className="font-display text-3xl font-extrabold leading-none tracking-[-0.02em] text-fg">
                {date.days}
              </span>
              <span className="pb-0.5">
                <span className="block font-display text-sm font-extrabold uppercase leading-none tracking-[0.06em] text-accent">
                  {date.month}
                </span>
                <span className="text-[11px] font-semibold text-fg-faint">{date.year}</span>
              </span>
            </>
          ) : words.tbcLabel ? (
            <span className="font-display text-lg font-extrabold uppercase text-fg-faint">
              {words.tbcLabel}
            </span>
          ) : null}
        </div>

        {/* The whole card is not a link — the numeral and the photograph are
            decoration and a nested anchor is invalid — so the name carries it,
            and after:inset-0 lets the rest of the card be clicked with it. It
            goes to the EVENT now rather than to the circuit: a past weekend has
            a report to read, and a circuit page says nothing about who won. */}
        <p className="mt-3 text-sm font-semibold leading-snug text-fg">
          <Link
            href={eventHref(site, event)}
            className="transition-colors after:absolute after:inset-0 hover:text-accent"
          >
            {name}
          </Link>
        </p>
        {where ? <p className="text-[13px] text-fg-faint">{where}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[13px]">
          {past ? (
            <span className="font-semibold text-fg-faint">Completed</span>
          ) : start ? (
            <CountdownLine target={start} />
          ) : null}
          {event.badge && !past ? <span className="text-fg-faint">{event.badge}</span> : null}
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────────── Helpers ──────────────────────────────── */

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      <span className="font-display font-bold text-white">{value}</span>
    </span>
  );
}
