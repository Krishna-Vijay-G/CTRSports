import { cn } from "@/lib/utils";
import type { SectionViewProps } from "@/lib/sections/types";
import type { Grid } from "./model";
import { Reveal } from "@/components/ui/Reveal";
import { Media } from "@/components/ui/Media";

/**
 * One grid for the whole country: the circuit on one side, the categories that
 * line up on it on the other.
 *
 * The inset sits on a white tile — it is artwork with its own light background,
 * and it loses its edges against the page otherwise.
 *
 * Nothing written is nothing drawn, piece by piece. Every wrapper here paints
 * something of its own — the figure has a border and a panel fill, the chip is
 * a bordered pill — so a section that has not been written yet used to come out
 * as a bordered box beside an empty outline. An `<img>` with no `src` is the
 * worst of them: the browser resolves "" against the page and re-requests the
 * page itself, then draws the bordered frame around the nothing it got back.
 */
export function GridView({ value: grid }: SectionViewProps<Grid>) {
  // The whole section is its picture and its copy. With neither there is no
  // section — only 128px of vertical padding around an empty two-column grid.
  if (!grid.image && !grid.label && !grid.heading && !grid.body && !grid.inset) return null;

  return (
    <section id="grid" className="shell py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        {grid.image ? (
          <Reveal>
            {/* `relative` so the sound button has something to sit in. Nothing
                else about the figure changes. */}
            <figure className="group relative overflow-hidden rounded-panel border border-line bg-panel">
              <Media
                src={grid.image}
                alt={grid.imageAlt}
                loading="lazy"
                decoding="async"
                sound
                className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </figure>
          </Reveal>
        ) : null}

        <Reveal delay={0.1}>
          {/* `.pill-label` is a bordered, filled pill, so an empty one is a
              visible outline with nothing in it rather than nothing at all.
              The same goes for the two blocks under it and their margins. */}
          {grid.label ? <span className="pill-label">{grid.label}</span> : null}
          {grid.heading ? (
            <h2
              className={cn(
                "headline text-[clamp(1.7rem,3.6vw,2.7rem)]",
                grid.label && "mt-4"
              )}
            >
              {grid.heading}
            </h2>
          ) : null}
          {grid.body ? (
            <p
              className={cn(
                "body-copy max-w-lg",
                (grid.label || grid.heading) && "mt-4"
              )}
            >
              {grid.body}
            </p>
          ) : null}

          {grid.inset ? (
            <figure className="panel-card mt-8 p-5">
              {/* `relative` on a wrapper rather than on the figure: the caption
                  below is inside it too, and the sound button would sit over
                  the words instead of over the picture. */}
              <div className="relative">
                <Media
                  src={grid.inset}
                  alt={grid.insetAlt}
                  loading="lazy"
                  decoding="async"
                  sound
                  className="h-auto w-full"
                />
              </div>
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
