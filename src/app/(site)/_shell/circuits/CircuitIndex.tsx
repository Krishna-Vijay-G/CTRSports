import Link from "next/link";
import { hasLayout, trackHref, type Track } from "@/lib/tracks";
import type { SiteRef } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { CircuitGhost } from "./CircuitMap";

/**
 * Every circuit, as a stack of wide plates.
 *
 * A circuit has two faces — the place, and the shape of the lap — and the card
 * carries both at once: the photograph down one side, the record down the
 * other, and the layout bled out of the bottom-right corner behind the type,
 * faded into the panel with a gradient mask. Both are on the card at rest, so
 * nothing here depends on a pointer: the same card on a phone shows the same
 * two things.
 *
 * Square corners throughout, hairline rules, labels in small caps at wide
 * tracking. Nothing is rounded: a timing screen is drawn with rules and right
 * angles, and softening them is what makes a motorsport page look like a
 * brochure.
 */
export function CircuitIndex({ site, tracks }: { site: SiteRef; tracks: Track[] }) {
  const races = tracks.reduce((total, track) => total + track.races_held, 0);
  const drawn = tracks.filter(hasLayout).length;

  return (
    <>
      <section className="shell pb-10 pt-12 sm:pt-16">
        <Reveal className="max-w-3xl">
          <span className="flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-fg-faint">
              Circuits
            </span>
          </span>

          <h1 className="headline mt-5 text-[clamp(2rem,5.5vw,3.75rem)] uppercase leading-[0.95]">
            The tracks the
            <br />
            championship runs on
          </h1>

          <p className="body-copy mt-5 max-w-xl">
            Every layout on the calendar, with the length, the corner count and the outright lap
            record for each — and the shape of every lap.
          </p>
        </Reveal>

        {tracks.length > 0 ? (
          <Reveal className="mt-9" delay={0.08}>
            <dl className="flex max-w-2xl flex-wrap border-y border-line">
              <Tally label="Circuits" value={String(tracks.length)} />
              <Tally label="Races held" value={races > 0 ? String(races) : "—"} />
              <Tally label="Layouts drawn" value={`${drawn}/${tracks.length}`} />
            </dl>
          </Reveal>
        ) : null}
      </section>

      <section className="shell pb-16 sm:pb-24">
        {tracks.length === 0 ? (
          <p className="border border-dashed border-line px-6 py-16 text-center text-fg-faint">
            No circuits have been added yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tracks.map((track, index) => (
              // The Reveal sits INSIDE the li: a <div> between a <ul> and its
              // <li> is invalid and browsers reparent it.
              <li key={track.id} className="flex">
                <Reveal delay={index * 0.06} className="w-full">
                  <CircuitCard site={site} track={track} position={index + 1} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Tally({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border-r border-line px-5 py-4 last:border-r-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fg-faint">
        {label}
      </dt>
      <dd className="mt-1.5 font-display text-2xl font-extrabold leading-none text-fg">{value}</dd>
    </div>
  );
}

export function CircuitCard({
  site,
  track,
  position,
}: {
  site: SiteRef;
  track: Track;
  position: number;
}) {
  const number = String(position).padStart(2, "0");

  return (
    <Link
      href={trackHref(site, track)}
      className="group relative flex w-full flex-col border border-line bg-panel transition-colors duration-300 hover:border-accent/60 focus-visible:border-accent sm:min-h-[17rem] sm:flex-row"
    >
      {/* ── The place ── */}
      <div className="relative h-56 shrink-0 overflow-hidden bg-black sm:h-auto sm:w-[42%] lg:w-[38%]">
        {track.photo_url ? (
          <img
            src={track.photo_url}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : null}

        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent"
        />

        <span
          aria-hidden
          className="absolute left-5 top-4 font-display text-5xl font-extrabold leading-none text-white/85"
        >
          {number}
        </span>
      </div>

      {/* ── The record ── */}
      {/* relative + isolate: the layout watermark below is positioned against
          this pane and must stay behind the type, and isolating it keeps the
          ghost's blend mode from reaching for anything outside the card. */}
      <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden p-6 sm:p-7">
        {/* The layout, bled out of the bottom-right corner and faded into the
            panel. It brightens as the card is reached, which is the whole of
            what the turn used to do — the shape is there either way. */}
        <CircuitGhost
          track={track}
          className="-bottom-8 -right-8 -z-10 h-48 w-64 text-accent opacity-[0.16] transition-opacity duration-500 group-hover:opacity-30 sm:h-56 sm:w-80"
        />

        <span className="flex items-center gap-3">
          {/* Runs out to meet the name as the card is reached. */}
          <span
            aria-hidden
            className="h-px w-8 bg-accent transition-all duration-300 group-hover:w-14"
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-fg-faint">
            Circuit {number}
          </span>
        </span>

        <h2 className="mt-4 font-display text-[clamp(1.35rem,2.4vw,1.9rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.01em] text-fg transition-colors group-hover:text-accent">
          {track.name}
        </h2>

        {track.location ? (
          <p className="mt-2 text-sm text-fg-faint">{track.location}</p>
        ) : null}

        {track.note ? (
          <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-relaxed text-fg-muted">
            {track.note}
          </p>
        ) : null}

        <dl className="mt-auto flex flex-wrap border-t border-line pt-4">
          <CardStat label="Length" value={track.length} />
          <CardStat label="Turns" value={track.turns} />
          <CardStat label="Races" value={track.races_held > 0 ? String(track.races_held) : "—"} />
        </dl>

        <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-fg-faint transition-colors group-hover:text-accent">
          Track overview
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </span>
      </div>
    </Link>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[7rem] flex-1 border-r border-line pr-4 last:border-r-0 [&+&]:pl-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-faint">
        {label}
      </dt>
      <dd className="mt-1 truncate font-display text-base font-bold text-fg">{value || "—"}</dd>
    </div>
  );
}
