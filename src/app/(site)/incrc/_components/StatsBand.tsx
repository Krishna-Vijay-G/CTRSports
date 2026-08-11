import { Reveal } from "@/components/ui/Reveal";
import { INCRC } from "../_data/incrc";

/**
 * The championship in four numbers.
 *
 * A gapped grid on the panel colour rather than four bordered cards: the
 * hairline gaps between them read as one instrument panel, which is what stops
 * the four figures competing with each other.
 */
export function StatsBand() {
  return (
    <section className="shell pt-16 sm:pt-20">
      <Reveal>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line md:grid-cols-4">
          {INCRC.stats.map((stat) => (
            <div key={stat.label} className="bg-panel px-5 py-8 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-4xl font-extrabold tracking-tight text-accent md:text-5xl">
                  {stat.value}
                </span>
                <span
                  aria-hidden
                  className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-faint"
                >
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
