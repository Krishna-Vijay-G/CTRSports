import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { INCRC } from "../_data/incrc";

/** The three circuits the championship runs on. */
export function VenuesSection() {
  return (
    <section id="venues" className="shell py-16 sm:py-20">
      <SectionHeading
        label="Championship venues"
        title={`${INCRC.venues.length} iconic circuits. One championship.`}
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {INCRC.venues.map((venue, index) => (
          <Reveal key={venue.number} delay={index * 0.06} className="flex">
            <li className="panel-card relative w-full overflow-hidden p-6">
              {/* The accent rule is the only thing marking these as a set —
                  numbering alone reads as a list, not as a circuit. */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />
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
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
