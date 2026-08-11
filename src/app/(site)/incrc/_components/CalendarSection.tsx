import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PinIcon } from "./icons";

/** The rounds of the season, in order. */
export function CalendarSection({ calendar }: { calendar: IncrcContent["calendar"] }) {
  return (
    <section id="calendar" className="shell py-16 sm:py-20">
      <SectionHeading label={calendar.label} title={calendar.title} />

      {/* An ordered list, because the rounds run in sequence and a screen reader
          should say so — the big numerals are decoration of that fact. */}
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {calendar.rounds.map((round, index) => (
          // The Reveal is INSIDE the li: a <div> between an <ol> and its <li> is
          // invalid and browsers reparent it.
          <li key={`${round.round}-${index}`} className="flex">
            <Reveal
              delay={index * 0.06}
              className="panel-card group relative w-full overflow-hidden p-6 transition-colors duration-300 hover:border-accent/40"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
                  Round
                </span>
                <span
                  aria-hidden
                  className="font-display text-4xl font-extrabold leading-none text-fg"
                >
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

              {round.status ? (
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-fg-faint">
                  <span aria-hidden className="block size-1.5 rounded-full bg-accent" />
                  {round.status}
                </p>
              ) : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
