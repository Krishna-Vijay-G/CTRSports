import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The championship in a handful of numbers.
 *
 * A gapped grid on the panel colour rather than separate bordered cards: the
 * hairline gaps between them read as one instrument panel, which is what stops
 * the figures competing with each other.
 */
export function StatsBand({ stats }: { stats: IncrcContent["stats"] }) {
  if (stats.items.length === 0) return null;

  return (
    <section id="stats" className="shell py-10 sm:py-12">
      <Reveal>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line md:grid-cols-4">
          {stats.items.map((stat, index) => (
            <div key={`${stat.label}-${index}`} className="bg-panel px-5 py-8 text-center">
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
