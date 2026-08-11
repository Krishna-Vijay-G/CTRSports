import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";

/**
 * One grid for the whole country: the circuit on one side, the categories that
 * line up on it on the other.
 *
 * The inset sits on a white tile — it is artwork with its own light background,
 * and it loses its edges against the page otherwise.
 */
export function GridSection({ grid }: { grid: IncrcContent["grid"] }) {
  return (
    <section id="grid" className="shell py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <Reveal>
          <figure className="group overflow-hidden rounded-panel border border-line bg-panel">
            <img
              src={grid.image}
              alt={grid.imageAlt}
              loading="lazy"
              decoding="async"
              className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </figure>
        </Reveal>

        <Reveal delay={0.1}>
          <span className="pill-label">{grid.label}</span>
          <h2 className="headline mt-4 text-[clamp(1.7rem,3.6vw,2.7rem)]">{grid.heading}</h2>
          <p className="body-copy mt-4 max-w-lg">{grid.body}</p>

          {grid.inset ? (
            <figure className="panel-card mt-8 p-5">
              <img
                src={grid.inset}
                alt={grid.insetAlt}
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
              {grid.caption ? (
                <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  {grid.caption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
