import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PinIcon } from "./icons";

/**
 * The circuits the championship runs on, each with its layout above it.
 *
 * The layout is the point of these cards. A venue is a name and a city on every
 * other motorsport site; the shape of the track is the thing that actually tells
 * a driver what the weekend will be like.
 *
 * The map is an uploaded picture, so it is whatever the circuit publishes. It
 * fills the head of the card edge to edge and is cropped to do it, which is what
 * keeps three cards of different source images looking like one set. The ground
 * behind it is white, because track maps are drawn as dark ink on paper and a
 * map with a transparent background would otherwise be invisible.
 *
 * Cropping to fill means a very wide map loses its ends. That is the trade for a
 * full bleed; a map that must be seen whole should be uploaded on a canvas
 * closer to this card's shape.
 *
 * A venue with no map simply has no well — better a clean card than an empty
 * frame.
 */
export function VenuesSection({ venues }: { venues: IncrcContent["venues"] }) {
  return (
    <section id="venues" className="shell py-16 sm:py-20">
      <SectionHeading label={venues.label} title={venues.title} />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.items.map((venue, index) => (
          // The Reveal is INSIDE the li: a <div> between a <ul> and its <li> is
          // invalid and browsers reparent it.
          <li key={`${venue.name}-${index}`} className="flex">
            <Reveal
              delay={index * 0.06}
              className="panel-card group relative w-full overflow-hidden transition-colors duration-300 hover:border-accent/40"
            >
              {/* Full bleed: no padding of its own, so the picture runs to the
                  card's edges and the card's own overflow-hidden clips it to
                  the top two corners. */}
              {venue.map ? (
                <div className="relative h-44 overflow-hidden bg-white">
                  <img
                    src={venue.map}
                    alt={`Circuit layout — ${venue.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
              ) : null}

              <div className={venue.map ? "border-t border-line p-6" : "p-6"}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
                  Venue {venue.number}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold leading-snug text-fg">
                  {venue.name}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-faint">
                  <PinIcon />
                  {venue.city}
                </p>
                {venue.note ? (
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{venue.note}</p>
                ) : null}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
