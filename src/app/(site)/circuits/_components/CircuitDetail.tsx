import Link from "next/link";
import type { Round } from "@/lib/incrcContent";
import { roundDateLabel } from "@/lib/raceDates";
import { majorEventList, trackHref, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { CircuitGhost, CircuitMap } from "./CircuitMap";
import { circuitFacts, leadFacts, splitFact, type Fact } from "./facts";

/**
 * One circuit, laid out as a collage of cards.
 *
 * Not an article with sections — a board of tiles, each one a single fact or a
 * single picture, sized by how much it has to say. A circuit's record is a dozen
 * unrelated things (a length, a licence grade, a lap record, a list of
 * championships) and running them down a page as prose makes them look like a
 * sequence when they are really a set. Tiles say "set".
 *
 * The grid is twelve columns from `lg:` and one below it. Every tile names its
 * own width, so adding a card later is one line and the board reflows around it.
 * The readouts across the second row size themselves to how many there are —
 * see `LEAD_SPANS` — so that row always fills rather than trailing off.
 *
 * Square corners, hairline borders, a short accent rule under every card's
 * label. It is the same vocabulary the index uses; what changes here is only the
 * arrangement.
 *
 * The header is passed in rather than imported, because whose links it carries
 * is the page's business. Unlike the index's hero it is NOT laid over anything —
 * a collage has no full-bleed photograph to lay it on, so the page hands in the
 * solid bar.
 *
 * `rounds` are the weekends the calendar sends here. They come from the INCRC
 * document while circuits come from their own table, so this component is given
 * them rather than reaching for them; a circuit nothing visits has no calendar
 * tile.
 */

/**
 * A placeholder until real machinery photography arrives — swap this one line
 * for a transparent PNG and the tile is done. It is a local asset rather than a
 * hotlink on purpose: a remote placeholder is a broken image on the day someone
 * else's bucket changes.
 */
const CAR_IMAGE = "/images/incrc/cars-lineup.webp";

/** How wide each readout tile is, by how many there are. Always fills twelve. */
const LEAD_SPANS: Record<number, string> = {
  1: "lg:col-span-12",
  2: "lg:col-span-6",
  3: "lg:col-span-4",
  4: "lg:col-span-3",
};

export function CircuitDetail({
  track,
  tracks,
  rounds = [],
  header,
}: {
  track: Track;
  /** The whole list, in running order — for the position and the prev/next tiles. */
  tracks: Track[];
  rounds?: Round[];
  header?: React.ReactNode;
}) {
  const facts = circuitFacts(track);
  const leads = leadFacts(track);
  const events = majorEventList(track);
  const visits = rounds.filter((round) => round.trackId === track.id);

  const index = tracks.findIndex((other) => other.id === track.id);
  const previous = index > 0 ? tracks[index - 1] : undefined;
  const following = index >= 0 && index < tracks.length - 1 ? tracks[index + 1] : undefined;
  const number = index >= 0 ? String(index + 1).padStart(2, "0") : "";

  const leadSpan = LEAD_SPANS[leads.length] ?? "lg:col-span-3";

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

          <span className="flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-fg-faint">
              {number ? `Circuit ${number} · ` : ""}Track overview
            </span>
          </span>
        </Reveal>

        <div className="mt-5 grid grid-cols-12 gap-3">
          {/* ─────────────────────────── Identity ─────────────────────────── */}
          <Tile
            delay={0}
            className="col-span-12 min-h-[19rem] justify-end overflow-hidden lg:col-span-7 lg:min-h-[23rem]"
          >
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
            ) : null}

            {/* The one flourish on the page: the hatch every racing livery and
                every timing screen carries. */}
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

            <h1 className="font-display text-[clamp(1.9rem,5vw,3.5rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-white">
              {track.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {track.location ? (
                <span className="text-sm font-medium text-white/70">{track.location}</span>
              ) : null}
              {track.fia_grade ? <Chip>FIA Grade {track.fia_grade}</Chip> : null}
              {track.direction ? <Chip>{track.direction}</Chip> : null}
              {track.opened ? <Chip>Opened {track.opened}</Chip> : null}
            </div>
          </Tile>

          {/* ──────────────────────────── Layout ──────────────────────────── */}
          <Tile
            delay={0.05}
            className="col-span-12 min-h-[19rem] items-center justify-center overflow-hidden bg-black/40 p-6 sm:p-8 lg:col-span-5 lg:min-h-[23rem]"
          >
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
              className="relative h-full max-h-[19rem] w-full text-accent"
            />

            {track.length ? (
              <span className="absolute bottom-4 right-5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-fg-muted">
                {track.length}
              </span>
            ) : null}
          </Tile>

          {/* ─────────────────────────── Readouts ─────────────────────────── */}
          {leads.map((fact, position) => (
            <Tile
              key={fact.label}
              delay={0.08 + position * 0.04}
              className={`col-span-6 ${leadSpan}`}
            >
              <CardLabel>{fact.label}</CardLabel>
              <Readout fact={fact} tone="dark" size="large" />
            </Tile>
          ))}

          {/* ─────────────────────────── The record ───────────────────────── */}
          {track.note ? (
            <Tile delay={0.1} className="col-span-12 lg:col-span-4">
              <CardLabel>Track summary</CardLabel>
              <p className="text-sm leading-relaxed text-fg-muted">{track.note}</p>
            </Tile>
          ) : null}

          {facts.length > 0 ? (
            <Tile delay={0.12} className="col-span-12 lg:col-span-4">
              <CardLabel>The record</CardLabel>
              <dl className="divide-y divide-line">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <dt className="shrink-0 text-[13px] text-fg-faint">{fact.label}</dt>
                    <dd className="text-right text-[13px] font-semibold text-fg">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Tile>
          ) : null}

          {/* ────────────────────────── Machinery ─────────────────────────── */}
          <Tile
            delay={0.14}
            className="col-span-12 min-h-[13rem] justify-between overflow-hidden lg:col-span-4"
          >
            <CardLabel>Machinery</CardLabel>

            <img
              src={CAR_IMAGE}
              alt=""
              aria-hidden
              loading="lazy"
              className="pointer-events-none absolute -bottom-2 right-0 w-[78%] max-w-[22rem] object-contain opacity-90"
              style={{
                maskImage: "linear-gradient(to top left, #000 45%, transparent 92%)",
                WebkitMaskImage: "linear-gradient(to top left, #000 45%, transparent 92%)",
              }}
            />

            <div className="relative">
              <p className="max-w-[10rem] text-sm leading-relaxed text-fg-muted">
                The cars that run here.
              </p>
              <Link
                href="/incrc#grid"
                className="group mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-accent transition hover:text-fg"
              >
                See the grid
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          </Tile>

          {/* ───────────────────── Championships & season ─────────────────── */}
          {events.length > 0 ? (
            <Tile delay={0.16} className={cn("col-span-12", visits.length > 0 && "lg:col-span-7")}>
              <CardLabel>Championships hosted</CardLabel>
              <ul className="flex flex-wrap gap-2">
                {events.map((event) => (
                  <li
                    key={event}
                    className="border border-line px-3.5 py-1.5 text-[13px] font-medium text-fg-muted"
                  >
                    {event}
                  </li>
                ))}
              </ul>
            </Tile>
          ) : null}

          {visits.length > 0 ? (
            <Tile delay={0.18} className={cn("col-span-12", events.length > 0 && "lg:col-span-5")}>
              <CardLabel>On the calendar</CardLabel>

              <ul className="divide-y divide-line">
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

              <Link
                href="/incrc#calendar"
                className="group mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-accent transition hover:text-fg"
              >
                The full season
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </Tile>
          ) : null}

          {/* ──────────────────── Official site & neighbours ──────────────── */}
          {track.website ? (
            <Tile delay={0.2} className="col-span-12 sm:col-span-6 lg:col-span-4">
              <CardLabel>Official site</CardLabel>
              <a
                href={track.website}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-3 font-display text-lg font-bold text-fg transition-colors hover:text-accent"
              >
                {displayHost(track.website)}
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  &nearr;
                </span>
              </a>
            </Tile>
          ) : null}

          <NeighbourTile track={previous} direction="previous" delay={0.22} />
          <NeighbourTile track={following} direction="next" delay={0.24} />
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── The parts ───────────────────────────── */

/**
 * One card of the collage.
 *
 * `relative isolate` on every one of them, without exception: half these tiles
 * put a photograph, a hatch or a masked car behind their own type, and isolating
 * each keeps that from reaching a neighbour.
 */
function Tile({
  className,
  delay,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal delay={delay} className={cn("flex", className)}>
      <div className="relative isolate flex w-full flex-col overflow-hidden border border-line bg-panel p-5 sm:p-6">
        {children}
      </div>
    </Reveal>
  );
}

/** A tile's name, with the short accent rule that marks the top of every card. */
function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative mb-4 block">
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
function Readout({
  fact,
  tone,
  size = "small",
}: {
  fact: Fact;
  tone: "light" | "dark";
  size?: "small" | "large";
}) {
  const { head, tail, numeric } = splitFact(fact);
  const strong = tone === "light" ? "text-white" : "text-fg";
  const weak = tone === "light" ? "text-white/50" : "text-fg-faint";

  if (!numeric) {
    return <span className={cn("text-sm font-semibold leading-snug", strong)}>{head}</span>;
  }

  return (
    <span className="relative flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          "font-display font-extrabold leading-none tracking-[-0.02em]",
          size === "large" ? "text-[clamp(1.6rem,3vw,2.35rem)]" : "text-[1.75rem]",
          strong
        )}
      >
        {head}
      </span>
      {tail ? <span className={cn("text-xs font-medium", weak)}>{tail}</span> : null}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-white/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
      {children}
    </span>
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

/**
 * One end of the row, as a tile.
 *
 * Renders nothing at all when there is no neighbour — unlike the old two-up
 * row, a collage has no pair to keep balanced, so an empty cell would just be a
 * hole in the board.
 */
function NeighbourTile({
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
    <Reveal delay={delay} className="col-span-12 flex sm:col-span-6 lg:col-span-4">
      <Link
        href={trackHref(track)}
        className="group relative isolate flex w-full items-center gap-5 overflow-hidden border border-line bg-panel p-5 transition-colors hover:border-accent/60 sm:p-6"
      >
        <CircuitGhost
          track={track}
          className="-bottom-6 -right-6 -z-10 h-32 w-44 text-accent opacity-[0.16] transition-opacity duration-500 group-hover:opacity-30"
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

/** "madrasmotorsports.com" — the bare host, without the scheme or a trailing /. */
function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
