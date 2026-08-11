import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PinIcon } from "./icons";
import { TrackMap } from "./TrackMap";

/**
 * The circuits the championship runs on, each with its layout drawn.
 *
 * The outline is the point of these cards. A venue is a name and a city on every
 * other motorsport site; the shape of the track is the thing that actually tells
 * a driver what the weekend will be like.
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
              {/* The outline sits in a well of its own, a shade darker than the
                  card, so the drawing reads as a diagram rather than an
                  illustration floating on the copy. */}
              <div className="relative bg-surface/60 px-6 pb-2 pt-7">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/[0.06] blur-2xl"
                />
                <TrackMap
                  track={venue.track}
                  className="mx-auto max-h-36 transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>

              <div className="border-t border-line p-6">
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
