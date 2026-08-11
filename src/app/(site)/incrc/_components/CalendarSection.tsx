import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { INCRC } from "../_data/incrc";
import { PinIcon } from "./VenuesSection";

/** The four rounds of the 2026 season, in order. */
export function CalendarSection() {
  return (
    <section id="calendar" className="shell py-16 sm:py-20">
      <SectionHeading label={INCRC.seasonKicker} title={INCRC.season} />

      {/* An ordered list, because the rounds run in sequence and a screen reader
          should say so — the big numerals are decoration of that fact. */}
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INCRC.rounds.map((round, index) => (
          <Reveal key={round.round} delay={index * 0.06} className="flex">
            <li className="panel-card relative w-full overflow-hidden p-6">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
                  Round
                </span>
                <span aria-hidden className="font-display text-4xl font-extrabold leading-none text-fg">
                  {round.round}
                </span>
              </div>

              <p className="mt-5 font-display text-[15px] font-bold text-fg">{round.dates}</p>

              <p className="mt-2 flex items-start gap-1.5 text-sm text-fg-muted">
                <span className="mt-0.5 text-accent">
                  <PinIcon />
                </span>
                <span>
                  <span className="font-semibold">{round.venue}</span>
                  <span className="block text-fg-faint">{round.city}</span>
                </span>
              </p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
