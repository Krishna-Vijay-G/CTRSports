import Link from "next/link";
import type { Round } from "@/lib/incrcContent";
import { roundDateLabel } from "@/lib/raceDates";
import { majorEventList, trackHref, type Track } from "@/lib/tracks";
import { Reveal } from "@/components/ui/Reveal";
import { CircuitMap } from "./CircuitMap";
import { circuitFacts, leadFacts, splitFact, type Fact } from "./facts";

/**
 * One circuit, drawn as a track overview rather than an article.
 *
 * The model is the screen a broadcast or a timing app puts up between sessions:
 * square corners, hairline rules, labels in small caps at wide tracking, and
 * values set as readouts — the number large, the unit small beside it. Nothing
 * is a rounded card, because the moment one thing is, the page stops looking
 * like an instrument and starts looking like a blog.
 *
 * Three bands, in the order a reader wants them:
 *
 *   the masthead   the photograph, the name at display size, and a strip of the
 *                  three numbers that describe the lap set flush along the
 *                  bottom edge — the shape every motorsport circuit page uses.
 *   the overview   the summary and the whole record down a narrow left rail,
 *                  the layout given the rest of the width on a ruled ground.
 *                  The drawing is the reason the page exists, so it gets the
 *                  space, and the rail is read beside it rather than under it.
 *   the rest       championships, the weekends that visit, the official site —
 *                  one hairline grid, no boxes.
 *
 * The header is passed in rather than imported, the same way the banner carousel
 * takes it: it is laid OVER the photograph, so it has to be inside this
 * component's positioned box, but which header — and whose links — is the page's
 * business, not this component's.
 *
 * `rounds` are the weekends the calendar sends here. They come from the INCRC
 * document while circuits come from their own table, so this component is given
 * them rather than reaching for them; a circuit nothing visits simply has no
 * calendar block.
 */
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
  const facts = circuitFacts(track);
  const leads = leadFacts(track);
  const events = majorEventList(track);
  const visits = rounds.filter((round) => round.trackId === track.id);

  const index = tracks.findIndex((other) => other.id === track.id);
  const previous = index > 0 ? tracks[index - 1] : undefined;
  const following = index >= 0 && index < tracks.length - 1 ? tracks[index + 1] : undefined;
  const number = index >= 0 ? String(index + 1).padStart(2, "0") : "";

  return (
    <>
      {/* ─────────────────────────── Masthead ─────────────────────────── */}
      <header className="relative isolate overflow-hidden border-b border-line">
        {track.photo_url ? (
          <>
            <img
              src={track.photo_url}
              alt=""
              aria-hidden
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Two washes, not one. The vertical lifts the copy off the photo;
                the horizontal keeps the left side dark on a wide screen, where
                the type sits over the brightest part of most track photographs. */}
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/85 to-black/50"
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/95 via-black/45 to-transparent lg:block"
            />
          </>
        ) : (
          <span aria-hidden className="absolute inset-0 -z-10 bg-panel" />
        )}

        {/* The one flourish on the page: a hatch in the top corner, the motif
            every racing livery and every timing screen carries. */}
        <span
          aria-hidden
          className="absolute right-0 top-0 -z-10 hidden h-40 w-64 opacity-40 md:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #f7d619 0 3px, transparent 3px 16px)",
            maskImage: "linear-gradient(225deg, #000, transparent 70%)",
            WebkitMaskImage: "linear-gradient(225deg, #000, transparent 70%)",
          }}
        />

        {header}

        {/* The top padding clears the header laid over it. Below md: the nav
            wraps onto a second row, so the header is taller there than it is on
            a wide screen — hence the larger value at the small end. */}
        <div className="shell relative pb-10 pt-36 md:pt-32 lg:pb-14 lg:pt-40">
          <Link
            href="/circuits"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50 transition hover:text-accent"
          >
            <span aria-hidden>&larr;</span>
            All circuits
          </Link>

          <span className="mt-7 flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
              {number ? `Circuit ${number} · ` : ""}Track overview
            </span>
          </span>

          <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.1rem,6.5vw,4.75rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-white">
            {track.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {track.location ? (
              <span className="text-sm font-medium text-white/70">{track.location}</span>
            ) : null}
            {track.fia_grade ? <Chip>FIA Grade {track.fia_grade}</Chip> : null}
            {track.direction ? <Chip>{track.direction}</Chip> : null}
            {track.opened ? <Chip>Opened {track.opened}</Chip> : null}
          </div>
        </div>

        {/* Flush along the bottom edge, over the photograph — the strip every
            circuit page in the sport puts there. */}
        {leads.length > 0 ? (
          <dl className="relative border-t border-white/15 bg-black/55 backdrop-blur-sm">
            <div className="shell flex flex-wrap">
              {leads.map((fact) => (
                <div
                  key={fact.label}
                  className="min-w-[9rem] flex-1 border-white/10 py-5 pr-6 [&+&]:border-l [&+&]:pl-6"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                    {fact.label}
                  </dt>
                  <dd className="mt-2">
                    <Readout fact={fact} tone="light" />
                  </dd>
                </div>
              ))}
            </div>
          </dl>
        ) : null}
      </header>

      {/* ─────────────────────────── Overview ─────────────────────────── */}
      <section className="shell py-10 lg:py-14">
        <div className="grid border border-line lg:grid-cols-[minmax(0,20rem)_1fr]">
          {/* The rail. */}
          <div className="border-b border-line p-6 lg:border-b-0 lg:border-r lg:p-7">
            {track.note ? (
              <Reveal>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                  Track summary
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-fg-muted">{track.note}</p>
              </Reveal>
            ) : null}

            {facts.length > 0 ? (
              <Reveal delay={0.06}>
                <dl className={track.note ? "mt-8 space-y-6" : "space-y-6"}>
                  {facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fg-faint">
                        {fact.label}
                      </dt>
                      <dd className="mt-1.5">
                        <Readout fact={fact} tone="dark" />
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            ) : null}
          </div>

          {/* The drawing. */}
          <div className="relative flex min-h-[22rem] items-center justify-center bg-black/40 p-8 lg:min-h-[34rem] lg:p-14">
            <span
              aria-hidden
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #f7d619 1px, transparent 1px), linear-gradient(to bottom, #f7d619 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* Corner ticks — the frame an instrument draws around a readout. */}
            <Ticks />

            <span className="absolute left-6 top-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-fg-faint">
              Circuit layout
            </span>

            <CircuitMap
              track={track}
              strokeWidth={5}
              className="relative h-full max-h-[30rem] w-full text-accent"
            />

            {track.length ? (
              <span className="absolute bottom-5 right-6 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-fg-muted">
                {track.length}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── The rest ───────────────────────── */}
      {events.length > 0 || visits.length > 0 || track.website ? (
        <section className="shell pb-12 lg:pb-16">
          {/* Two columns only when there are two things to put in them. The
              hairlines here are the grid's own gap showing the ground through,
              so an unfilled cell would not be empty — it would be a solid block
              of the line colour where a panel should be. */}
          <div
            className={`grid gap-px border border-line bg-line ${
              visits.length > 0 && track.website ? "md:grid-cols-2" : ""
            }`}
          >
            {events.length > 0 ? (
              <Block title="Championships hosted" className="md:col-span-full">
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
              </Block>
            ) : null}

            {visits.length > 0 ? (
              <Block title="On the calendar">
                <ul className="divide-y divide-line">
                  {visits.map((round, position) => (
                    <li
                      key={`${round.round}-${position}`}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
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
                  className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-accent transition hover:text-fg"
                >
                  The full season
                  <span aria-hidden>&rarr;</span>
                </Link>
              </Block>
            ) : null}

            {track.website ? (
              <Block title="Official site">
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
              </Block>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ───────────────────────── Along the row ──────────────────────── */}
      {previous || following ? (
        <nav aria-label="Other circuits" className="shell pb-16 sm:pb-20">
          <div className="grid gap-3 sm:grid-cols-2">
            <NeighbourLink track={previous} direction="previous" />
            <NeighbourLink track={following} direction="next" />
          </div>
        </nav>
      ) : null}
    </>
  );
}

/* ───────────────────────────── The parts ───────────────────────────── */

/**
 * A value set as an instrument sets it: the number large, whatever follows it
 * small alongside. Words come back at prose size — see `splitFact`.
 */
function Readout({ fact, tone }: { fact: Fact; tone: "light" | "dark" }) {
  const { head, tail, numeric } = splitFact(fact);
  const strong = tone === "light" ? "text-white" : "text-fg";
  const weak = tone === "light" ? "text-white/50" : "text-fg-faint";

  if (!numeric) {
    return <span className={`text-sm font-semibold leading-snug ${strong}`}>{head}</span>;
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={`font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] ${strong}`}
      >
        {head}
      </span>
      {tail ? <span className={`text-xs font-medium ${weak}`}>{tail}</span> : null}
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

/** One cell of the hairline grid. The grid's own gap-px draws the rules. */
function Block({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-panel p-6 lg:p-7 ${className ?? ""}`}>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-fg-faint">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
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
          className={`pointer-events-none absolute size-4 border-accent/40 ${position}`}
        />
      ))}
    </>
  );
}

/**
 * One end of the row. Renders an empty cell rather than nothing when there is no
 * neighbour, so the circuit at either end does not have its one link stretch to
 * the full width and read as a different control.
 */
function NeighbourLink({
  track,
  direction,
}: {
  track: Track | undefined;
  direction: "previous" | "next";
}) {
  if (!track) return <span aria-hidden className="hidden sm:block" />;

  const isNext = direction === "next";

  return (
    <Link
      href={trackHref(track)}
      className="group flex items-center gap-5 border border-line bg-panel p-4 transition-colors hover:border-accent/60"
    >
      <span
        className={`flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden bg-black/50 p-2 text-accent ${
          isNext ? "order-2" : ""
        }`}
      >
        <CircuitMap track={track} strokeWidth={8} className="h-full w-full" />
      </span>

      <span className={`min-w-0 flex-1 ${isNext ? "order-1 text-right" : ""}`}>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-fg-faint">
          {isNext ? "Next circuit" : "Previous circuit"}
        </span>
        <span className="mt-1.5 block truncate font-display text-base font-bold uppercase text-fg transition-colors group-hover:text-accent">
          {track.name}
        </span>
      </span>
    </Link>
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
