"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IncrcContent, Round } from "@/lib/incrcContent";
import { nextRoundIndex, roundDateParts, roundEnd, roundStart } from "@/lib/raceDates";
import { findTrack, trackHref, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Countdown, CountdownLine } from "./Countdown";
import { PinIcon } from "./icons";

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
 *                    fitted into a tile. It is what makes one round look
 *                    different from the next at a glance.
 *   the next race    lifted out above the grid, at its own scale, with the clock
 *                    running. The rest of the season is a grid; the next round
 *                    is an event.
 *
 * Which round is "next" is decided by the clock, not by position: the first
 * whose last day has not passed. That has to happen in the browser — the
 * server's answer would be baked into a statically rendered page and would rot
 * the moment the weekend passed. Until it does, the first round leads: correct
 * markup, no layout jump, and no clock read during render.
 *
 * Circuits come from ctr_tracks. A round with no `trackId` falls back to the
 * venue and city typed on it, and simply has no photograph.
 */
export function CalendarSection({
  calendar,
  tracks,
}: {
  calendar: IncrcContent["calendar"];
  tracks: Track[];
}) {
  const { rounds } = calendar;

  // Null until the browser has read the clock. Nothing below may read it during
  // render; every time-dependent decision on this screen comes from here.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    // The season turns over once a weekend, so a slow tick is plenty — it is
    // here so a tab left open overnight still promotes the right round.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const next = now ? nextRoundIndex(rounds, now) : -1;

  if (rounds.length === 0) {
    return (
      <section id="calendar" className="shell py-16 sm:py-20">
        <SectionHeading label={calendar.label} title={calendar.title} />
      </section>
    );
  }

  const leadIndex = next === -1 ? 0 : next;
  const lead = rounds[leadIndex];

  return (
    <section id="calendar" className="shell py-16 sm:py-20">
      <SectionHeading label={calendar.label} title={calendar.title} />

      <Reveal className="mt-10">
        <NextRound round={lead} track={findTrack(tracks, lead.trackId)} isNext={next !== -1} />
      </Reveal>

      {/* The whole season stays in the list, the next round included, because
          the running order is the season and dropping a round out of it to
          feature it above would leave a hole where round three should be. */}
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rounds.map((round, index) => (
          <li key={`${round.round}-${index}`} className="flex">
            <Reveal delay={index * 0.05} className="w-full">
              <RoundCard
                round={round}
                track={findTrack(tracks, round.trackId)}
                past={isPast(round, now)}
                current={index === leadIndex && next !== -1}
              />
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─────────────────────────── The next round ─────────────────────────── */

/**
 * The event. Full width, the circuit's photograph behind it, the clock running.
 */
function NextRound({
  round,
  track,
  isNext,
}: {
  round: Round;
  track: Track | undefined;
  isNext: boolean;
}) {
  const start = roundStart(round);
  const date = roundDateParts(round);
  const venue = track?.name || round.venue;
  const where = track?.location || round.city;

  return (
    <article className="relative isolate overflow-hidden rounded-card border border-line bg-panel">
      {track?.photo_url ? (
        <>
          <img
            src={track.photo_url}
            alt=""
            aria-hidden
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-ink">
              {isNext ? (
                <span aria-hidden className="block size-1.5 animate-pulse rounded-full bg-accent-ink" />
              ) : null}
              {isNext ? "Next round" : `Round ${round.round}`}
            </span>

            {isNext && round.round ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Round {round.round}
              </span>
            ) : null}

            {round.status ? (
              <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/70">
                {round.status}
              </span>
            ) : null}
          </div>

          {/* The date block: days large, everything else beneath at a whisper. */}
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
                Date TBC
              </span>
            )}
          </div>

          <h3 className="headline mt-6 text-[clamp(1.5rem,3vw,2.25rem)] text-white">{venue}</h3>

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

          {/* Only when the round points at a circuit: a round that carries only
              typed-in venue text has no page to go to. */}
          {track ? (
            <Link
              href={trackHref(track)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-[13px] font-semibold text-white transition hover:border-accent hover:text-accent"
            >
              Circuit guide
              <span aria-hidden>&rarr;</span>
            </Link>
          ) : null}
        </div>

        {/* The clock sits at the end of the row on a wide screen and under the
            copy on a narrow one, which is the only arrangement where it never
            competes with the date block for the eye. */}
        {start ? (
          <div className="shrink-0 lg:text-right">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              {isNext ? "Lights out in" : "Starts in"}
            </p>
            <Countdown target={start} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

/* ──────────────────────────── The season ────────────────────────────── */

/** One round in the grid: photograph, date block, circuit, distance. */
function RoundCard({
  round,
  track,
  past,
  current,
}: {
  round: Round;
  track: Track | undefined;
  /** Decided by the parent from its one clock read, never here. */
  past: boolean;
  current: boolean;
}) {
  const start = roundStart(round);
  const date = roundDateParts(round);
  const venue = track?.name || round.venue;
  const where = track?.location || round.city;

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
        {track?.photo_url ? (
          <img
            src={track.photo_url}
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

        <span className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
          Round
        </span>
        <span
          aria-hidden
          className="absolute bottom-2 left-4 font-display text-4xl font-extrabold leading-none text-white drop-shadow"
        >
          {round.round}
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
          ) : (
            <span className="font-display text-lg font-extrabold uppercase text-fg-faint">
              Date TBC
            </span>
          )}
        </div>

        {/* The whole card is not a link — a past round with nothing to read
            would then be a dead one — so the circuit's name carries it, and
            after:inset-0 lets the rest of the card be clicked with it. */}
        {track ? (
          <p className="mt-3 text-sm font-semibold leading-snug text-fg">
            <Link
              href={trackHref(track)}
              className="transition-colors after:absolute after:inset-0 hover:text-accent"
            >
              {venue}
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-sm font-semibold leading-snug text-fg">{venue}</p>
        )}
        {where ? <p className="text-[13px] text-fg-faint">{where}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[13px]">
          {past ? (
            <span className="font-semibold text-fg-faint">Completed</span>
          ) : start ? (
            <CountdownLine target={start} />
          ) : null}
          {round.status && !past ? (
            <span className="text-fg-faint">{round.status}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────────── Helpers ──────────────────────────────── */

/** A weekend already run. False until the browser has read the clock. */
function isPast(round: Round, now: Date | null): boolean {
  if (!now) return false;
  const end = roundEnd(round);
  return end ? end.getTime() < now.getTime() : false;
}

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
