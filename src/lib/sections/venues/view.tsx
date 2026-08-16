import Link from "next/link";
import { hasLayout, trackHref, type Track } from "@/lib/tracks";
import type { SectionViewProps } from "@/lib/sections/types";
import type { SiteRef } from "@/lib/sites";
import type { Venues } from "./model";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CircuitMap } from "@/app/(site)/_shell/circuits/CircuitMap";
import { PinIcon } from "@/lib/sections/shared/icons";

/**
 * The circuits the championship runs on, each with its layout above it.
 *
 * The circuits come from ctr.tracks — the same rows /circuits and the calendar
 * read — so a circuit is described once and the three screens can never disagree
 * about its name, its city or the shape of its lap. Nothing about a venue is
 * typed into the incrc document any more; only the heading above them is.
 *
 * This is a taste, not the list: the first three in the admin's order, with the
 * button under them going to the page that holds all of them. The order is the
 * circuits screen's order, so which three appear here is dragged, not coded.
 *
 * The button's words and its address are the document's, as are the two lines
 * every card prints around the circuit's own details. They were constants here,
 * which put "View all circuits" on a page whose document said nothing — copy
 * arriving from a component rather than from whoever edits the site. Blank
 * leaves each piece off rather than falling back to wording nobody chose.
 *
 * The layout is the point of these cards. A venue is a name and a city on every
 * other motorsport site; the shape of the track is the thing that actually tells
 * a driver what the weekend will be like. `CircuitMap` is what draws it, so a
 * traced outline comes out in the accent and an uploaded picture comes out on
 * white — the same two treatments the circuit's own page gives it.
 *
 * A circuit with neither simply has no well — better a clean card than an empty
 * frame — and an unreachable database leaves the heading with the button under
 * it rather than taking the section down.
 */

/** Three across on a laptop. More would be the /circuits page, badly. */
const SHOWN = 3;

export function VenuesView({ value: venues, records }: SectionViewProps<Venues>) {
  const { tracks } = records;

  const shown = tracks.slice(0, SHOWN);
  const button = Boolean(venues.ctaLabel && venues.ctaHref);

  // Nothing to head, nothing to list and nowhere to go is not a section — it is
  // 128px of vertical padding wrapped around an empty <section>.
  if (!venues.label && !venues.title && shown.length === 0 && !button) return null;

  return (
    <section id="venues" className="shell py-16 sm:py-20">
      <SectionHeading label={venues.label} title={venues.title} />

      {shown.length > 0 ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((track, index) => (
            // The Reveal is INSIDE the li: a <div> between a <ul> and its <li> is
            // invalid and browsers reparent it.
            <li key={track.id} className="flex">
              <Reveal delay={index * 0.06} className="flex w-full">
                <VenueCard
                  site={records.site}
                  track={track}
                  position={index + 1}
                  label={venues.cardLabel}
                  cta={venues.cardCta}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      ) : null}

      {button ? (
        <Reveal className="mt-10 flex justify-center">
          <ActionButton href={venues.ctaHref} variant="outline">
            {venues.ctaLabel}
          </ActionButton>
        </Reveal>
      ) : null}
    </section>
  );
}

/**
 * One circuit, as the card it was before the data moved — the layout above, the
 * name, the city and the line about it below.
 *
 * The whole card is the link now that there is somewhere to go: every circuit
 * has a page, so there is no dead card to worry about, and spans rather than
 * divs inside it because it is an <a>.
 */
function VenueCard({
  site,
  track,
  position,
  label,
  cta,
}: {
  site: SiteRef;
  track: Track;
  position: number;
  /** The word before the card's number. Blank prints no eyebrow at all. */
  label: string;
  /** The line at the foot of the card. Blank prints nothing, arrow included. */
  cta: string;
}) {
  const drawn = hasLayout(track);

  return (
    <Link
      href={trackHref(site, track)}
      className="panel-card group relative flex h-full w-full flex-col overflow-hidden transition-colors duration-300 hover:border-accent/40"
    >
      {/* Full bleed: no padding of its own, so the drawing runs to the card's
          edges and the card's own overflow-hidden clips it to the top two
          corners. */}
      {drawn ? (
        <span className="relative block h-44 overflow-hidden">
          <CircuitMap
            track={track}
            className="h-full w-full text-accent transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </span>
      ) : null}

      <span className={cn("flex flex-1 flex-col p-6", drawn && "border-t border-line")}>
        {label ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
            {label} {String(position).padStart(2, "0")}
          </span>
        ) : null}

        <span
          className={cn(
            "font-display text-lg font-bold leading-snug text-fg transition-colors group-hover:text-accent",
            label && "mt-2"
          )}
        >
          {track.name}
        </span>

        {track.location ? (
          <span className="mt-2 flex items-center gap-1.5 text-sm text-fg-faint">
            <PinIcon />
            {track.location}
          </span>
        ) : null}

        {track.note ? (
          <span className="mt-3 text-sm leading-relaxed text-fg-muted">{track.note}</span>
        ) : null}

        {cta ? (
          <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[13px] font-semibold text-fg-faint transition-colors group-hover:text-accent">
            {cta}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}
