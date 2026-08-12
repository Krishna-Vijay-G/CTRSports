import Link from "next/link";
import type { Round } from "@/lib/incrcContent";
import { roundDateLabel } from "@/lib/raceDates";
import { hostOf, majorEventList, trackHref, type Track, type TrackLink } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { CircuitGhost, CircuitMap } from "./CircuitMap";
import { detailFacts, headlineFacts, splitFact, type Fact } from "./facts";

/**
 * One circuit.
 *
 * Four bands, and the order is a hierarchy rather than a list — which is the
 * whole correction over the version this replaces. That one gave every fact a
 * tile of the same size, so a two-character corner count sat in as much room as
 * the circuit's photograph, and the page read as a wall of equally important
 * nothing.
 *
 * How the sport itself prints a circuit settles it. Formula 1's circuit guides
 * carry five labelled facts in one compact strip; the guides that people
 * actually browse give the drawing the most weight on the page and subordinate
 * everything else to it. So:
 *
 *   1  masthead    the photograph, the name at display size, and the numbers
 *                  that describe the lap set flush beneath it as ONE divided
 *                  strip. Masthead and strip share a border: they are one
 *                  object, the way a title block is.
 *   2  the lap     the drawing, given the largest area on the page, with the
 *                  summary and the rest of the record in a narrow rail beside
 *                  it. This is the band the page exists for.
 *   3  context     championships and the weekends that visit — real data, only
 *                  drawn when there is some.
 *   4  the row     the official site and the circuits either side.
 *
 * Nothing here is invented to fill a space. Every block is a field someone can
 * edit in the admin, and a block with nothing behind it is not drawn at all.
 *
 * The header is passed in rather than imported, because whose links it carries
 * is the page's business. It is the solid bar in the flow, not an overlay: the
 * masthead is a bordered panel inside the page's rhythm, not a full-bleed hero.
 *
 * `rounds` are the weekends the calendar sends here. They come from the INCRC
 * document while circuits come from their own table, so this component is given
 * them rather than reaching for them.
 */
/**
 * How the headline strip divides, by how many facts it has.
 *
 * Three is the odd one out: three across a phone is too tight to read, so it
 * stacks there and only lines up from `sm:`. Two and four divide evenly at both
 * widths, so they never stack.
 */
const STRIP_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function CircuitDetail({
  track,
  tracks,
  rounds = [],
  header,
}: {
  track: Track;
  /** The whole list, in running order — for the position and the prev/next feet. */
  tracks: Track[];
  rounds?: Round[];
  header?: React.ReactNode;
}) {
  const headline = headlineFacts(track);
  const record = detailFacts(track);
  const events = majorEventList(track);
  const visits = rounds.filter((round) => round.trackId === track.id);

  const index = tracks.findIndex((other) => other.id === track.id);
  const previous = index > 0 ? tracks[index - 1] : undefined;
  const following = index >= 0 && index < tracks.length - 1 ? tracks[index + 1] : undefined;
  const number = index >= 0 ? String(index + 1).padStart(2, "0") : "";

  return (
    <>
      {header}

      <div className="shell py-6 lg:py-10">
        <Reveal className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link
            href="/circuits"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-fg-faint transition hover:text-accent"
          >
            <span aria-hidden>&larr;</span>
            All circuits
          </Link>

          {number ? (
            <span className="flex items-center gap-3">
              <span aria-hidden className="h-px w-10 bg-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-fg-faint">
                Circuit {number}
              </span>
            </span>
          ) : null}
        </Reveal>

        {/* ───────────────── 1 · Masthead and the lap in numbers ──────────── */}
        <Reveal className="mt-5 block border border-line">
          <div className="relative isolate flex min-h-[15rem] flex-col justify-end overflow-hidden p-6 sm:min-h-[19rem] sm:p-8 lg:min-h-[23rem] lg:p-10">
            {track.photo_url ? (
              <>
                <img
                  src={track.photo_url}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 -z-20 h-full w-full object-cover"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/80 to-black/35"
                />
              </>
            ) : (
              <span aria-hidden className="absolute inset-0 -z-10 bg-panel" />
            )}

            {/* The one flourish: the hatch every racing livery carries. */}
            <span
              aria-hidden
              className="absolute right-0 top-0 -z-10 hidden h-32 w-52 opacity-40 sm:block"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, #f7d619 0 3px, transparent 3px 16px)",
                maskImage: "linear-gradient(225deg, #000, transparent 70%)",
                WebkitMaskImage: "linear-gradient(225deg, #000, transparent 70%)",
              }}
            />

            <h1 className="max-w-4xl font-display text-[clamp(1.9rem,5.5vw,4rem)] font-extrabold uppercase leading-[0.93] tracking-[-0.02em] text-white">
              {track.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {track.location ? (
                <span className="text-sm font-medium text-white/70">{track.location}</span>
              ) : null}
              {track.fia_grade ? <Chip>FIA Grade {track.fia_grade}</Chip> : null}
              {track.direction ? <Chip>{track.direction}</Chip> : null}
            </div>
          </div>

          {/* One strip, hairline-divided. Short values belong here and nowhere
              else — this is the row the whole page is measured against.

              The column count is the number of facts, so the row always fills
              exactly. That matters more than it looks: the hairlines are the
              grid's own gap letting the ground through, so a half-empty row
              would not be empty — it would be a solid block of line colour. */}
          {headline.length > 0 ? (
            <dl className={cn("grid gap-px border-t border-line bg-line", STRIP_COLUMNS[headline.length])}>
              {headline.map((fact) => (
                <div key={fact.label} className="bg-panel px-5 py-4 sm:px-6 sm:py-5">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fg-faint">
                    {fact.label}
                  </dt>
                  <dd className="mt-2">
                    <Readout fact={fact} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Reveal>

        {/* ──────────────────────── 2 · The lap ──────────────────────────── */}
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_21rem]">
          <Reveal className="flex">
            <div className="relative isolate flex w-full items-center justify-center overflow-hidden border border-line bg-black/40 p-6 sm:p-10 lg:min-h-[30rem]">
              <span
                aria-hidden
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #f7d619 1px, transparent 1px), linear-gradient(to bottom, #f7d619 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              <Ticks />

              <span className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-fg-faint">
                Circuit layout
              </span>

              <CircuitMap
                track={track}
                strokeWidth={5}
                className="relative h-full max-h-[26rem] min-h-[13rem] w-full text-accent"
              />
            </div>
          </Reveal>

          {track.note || record.length > 0 ? (
            <div className="flex flex-col gap-3">
              {track.note ? (
                <Reveal delay={0.05}>
                  <section className="border border-line bg-panel p-6">
                    <SectionLabel>Track summary</SectionLabel>
                    <p className="mt-4 text-sm leading-relaxed text-fg-muted">{track.note}</p>
                  </section>
                </Reveal>
              ) : null}

              {record.length > 0 ? (
                <Reveal delay={0.09} className="flex flex-1">
                  <section className="w-full border border-line bg-panel p-6">
                    <SectionLabel>The record</SectionLabel>
                    <dl className="mt-4 divide-y divide-line">
                      {record.map((fact) => (
                        <div
                          key={fact.label}
                          className="flex items-baseline justify-between gap-5 py-2.5 first:pt-0 last:pb-0"
                        >
                          <dt className="shrink-0 text-[13px] text-fg-faint">{fact.label}</dt>
                          <dd className="text-right text-[13px] font-semibold text-fg">
                            {fact.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </Reveal>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ─────────────────────── 3 · Context ───────────────────────────── */}
        {events.length > 0 || visits.length > 0 ? (
          <div
            className={cn(
              "mt-3 grid gap-3",
              events.length > 0 && visits.length > 0 && "lg:grid-cols-[1fr_21rem]"
            )}
          >
            {events.length > 0 ? (
              <Reveal className="flex">
                <section className="w-full border border-line bg-panel p-6">
                  <SectionLabel>Championships hosted</SectionLabel>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {events.map((event) => (
                      <li
                        key={event}
                        className="border border-line px-3.5 py-1.5 text-[13px] font-medium text-fg-muted"
                      >
                        {event}
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ) : null}

            {visits.length > 0 ? (
              <Reveal delay={0.05} className="flex">
                <section className="w-full border border-line bg-panel p-6">
                  <SectionLabel>On the calendar</SectionLabel>

                  <ul className="mt-4 divide-y divide-line">
                    {visits.map((round, position) => (
                      <li
                        key={`${round.round}-${position}`}
                        className="flex items-center gap-4 py-2.5 first:pt-0"
                      >
                        <span className="font-display text-xl font-extrabold leading-none text-accent">
                          {round.round}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">
                            {roundDateLabel(round) || "Date to be confirmed"}
                          </span>
                          {round.status ? (
                            <span className="block truncate text-[13px] text-fg-faint">
                              {round.status}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Arrow href="/incrc#calendar">The full season</Arrow>
                </section>
              </Reveal>
            ) : null}
          </div>
        ) : null}

        {/* ────────────────────── 4 · Related links ──────────────────────── */}
        {track.links.length > 0 ? (
          <Reveal className="mt-3 block">
            <section className="border border-line bg-panel p-6">
              <SectionLabel>Related links</SectionLabel>

              {/* Tags, so each is only as wide as its own words and the row
                  wraps — a grid would stretch a two-word link to the width of a
                  column and leave it mostly empty. */}
              <ul className="mt-4 flex flex-wrap gap-2">
                {track.links.map((link) => (
                  <li key={`${link.href}-${link.label}`} className="max-w-full">
                    <LinkTag link={link} />
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ) : null}

        {/* ──────────────────────── 5 · The row ──────────────────────────── */}
        {previous || following ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NeighbourLink track={previous} direction="previous" delay={0.05} />
            <NeighbourLink track={following} direction="next" delay={0.09} />
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ───────────────────────────── The parts ───────────────────────────── */

/** A block's name, with the short accent rule that marks the top of each one. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-fg-faint">
        {children}
      </span>
      <span aria-hidden className="mt-2.5 block h-px w-9 bg-accent" />
    </span>
  );
}

/**
 * A value set as an instrument sets it: the number large, whatever follows it
 * small alongside. Words come back at prose size — see `splitFact`.
 */
function Readout({ fact }: { fact: Fact }) {
  const { head, tail, numeric } = splitFact(fact);

  if (!numeric) {
    return <span className="text-sm font-semibold leading-snug text-fg">{head}</span>;
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-extrabold leading-none tracking-[-0.02em] text-fg">
        {head}
      </span>
      {tail ? <span className="text-xs font-medium text-fg-faint">{tail}</span> : null}
    </span>
  );
}

/**
 * One related link, as a tag with a square arrow box on the end.
 *
 * Sized to its own text and nothing more: the box is `inline-flex`, so a link
 * called "Entry list" takes the width of those two words and the row wraps when
 * it runs out. That is the difference between a set of links and a set of cards
 * — cards claim a column each whether or not they have anything to put in it.
 *
 * `items-stretch` is what makes the arrow box the full height of the tag rather
 * than a square floating inside it, so the two read as one object divided by a
 * rule. The min-height and the box's width are the same value, which keeps that
 * end square whatever the text does.
 *
 * External links get the arrow turned out of the box; an internal one keeps it
 * pointing along the reading direction. Which it is comes from the address, not
 * from a field someone has to remember to tick.
 */
function LinkTag({ link }: { link: TrackLink }) {
  const external = /^https?:/i.test(link.href);

  return (
    <a
      href={link.href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      title={hostOf(link.href)}
      className="group inline-flex h-9 max-w-full items-stretch border border-line bg-surface transition-colors hover:border-accent/60"
    >
      <span className="flex min-w-0 items-center px-3.5 text-[13px] font-medium text-fg transition-colors group-hover:text-accent">
        <span className="truncate">{link.label}</span>
      </span>

      {/* -mt-px -mb-px: the box sits over the tag's own top and bottom rules
          rather than inside them, so its edge lines up with the tag's. */}
      <span className="-mb-px -mt-px flex w-9 shrink-0 items-center justify-center border-y border-l border-line bg-panel text-accent transition-colors group-hover:border-accent/60 group-hover:bg-accent group-hover:text-accent-ink">
        <ArrowIcon
          className={cn(
            "transition-transform duration-300",
            external
              ? "-rotate-45 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              : "group-hover:translate-x-0.5"
          )}
        />
      </span>
    </a>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-white/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
      {children}
    </span>
  );
}

function Arrow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-accent transition hover:text-fg"
    >
      {children}
      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
        &rarr;
      </span>
    </Link>
  );
}

/** Four corner brackets — the frame an instrument draws around a readout. */
function Ticks() {
  const corners = [
    "left-3 top-3 border-l border-t",
    "right-3 top-3 border-r border-t",
    "left-3 bottom-3 border-b border-l",
    "right-3 bottom-3 border-b border-r",
  ];

  return (
    <>
      {corners.map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn("pointer-events-none absolute size-4 border-accent/40", position)}
        />
      ))}
    </>
  );
}

/** One end of the row. Nothing at all when there is no neighbour. */
function NeighbourLink({
  track,
  direction,
  delay,
}: {
  track: Track | undefined;
  direction: "previous" | "next";
  delay?: number;
}) {
  if (!track) return null;

  const isNext = direction === "next";

  return (
    <Reveal delay={delay} className="flex">
      <Link
        href={trackHref(track)}
        className="group relative isolate flex w-full items-center gap-4 overflow-hidden border border-line bg-panel p-5 transition-colors hover:border-accent/60"
      >
        <CircuitGhost
          track={track}
          className="-bottom-6 -right-6 -z-10 h-28 w-40 text-accent opacity-[0.16] transition-opacity duration-500 group-hover:opacity-30"
        />

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-fg-faint">
            {isNext ? "Next circuit" : "Previous circuit"}
          </span>
          <span className="mt-2 block truncate font-display text-base font-bold uppercase text-fg transition-colors group-hover:text-accent">
            {track.name}
          </span>
        </span>

        <span
          aria-hidden
          className="shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1"
        >
          &rarr;
        </span>
      </Link>
    </Reveal>
  );
}
