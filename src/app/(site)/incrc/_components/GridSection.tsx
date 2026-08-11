import { Reveal } from "@/components/ui/Reveal";
import { INCRC } from "../_data/incrc";

/**
 * One grid for the whole country: the circuit on one side, the categories that
 * line up on it on the other.
 *
 * The car line-up sits on a white tile — it is artwork with its own light
 * background, and it loses its edges against the page otherwise.
 */
export function GridSection() {
  const { grid } = INCRC;

  return (
    <section id="grid" className="shell py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <figure className="overflow-hidden rounded-panel border border-line">
            <img
              src={grid.circuitImage}
              alt={grid.circuitAlt}
              loading="lazy"
              decoding="async"
              className="h-auto w-full"
            />
          </figure>
        </Reveal>

        <Reveal delay={0.1}>
          <span className="pill-label">{INCRC.tagline}</span>
          <h2 className="headline mt-4 text-[clamp(1.6rem,3.4vw,2.5rem)]">{grid.heading}</h2>
          <p className="body-copy mt-4 max-w-lg">{grid.body}</p>

          <figure className="panel-card mt-7 p-5">
            <img
              src={grid.carsImage}
              alt={grid.carsAlt}
              loading="lazy"
              decoding="async"
              className="h-auto w-full"
            />
            <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {grid.circuitCaption}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
