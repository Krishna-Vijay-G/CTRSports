import { cellName, collageVars, resolveCollage } from "@/lib/collage";
import type { IncrcContent } from "@/lib/incrcContent";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";

/**
 * How the championship came about: the signing.
 *
 * A collage rather than a row of equal tiles. Equal thirds would say "three
 * photographs"; a collage says "here is the moment, and here are two more from
 * it" — which is the difference between a gallery and a story.
 *
 * WHICH collage is chosen in the admin: the arrangements live in
 * src/lib/collage.ts, one to six photographs, and the order of the photographs
 * is the order of the cells. `resolveCollage` is what keeps the two in step —
 * an arrangement is only drawn when it holds exactly as many photographs as
 * have been added, so there is never a grid with a hole in it.
 *
 * Below md the arrangement is dropped and the photographs stack; see `.collage`
 * in globals.css. Nothing about a mosaic survives a 375px screen, and a phone
 * showing three photographs in a column is the honest version of it.
 */
export function PartnershipSection({
  partnership,
}: {
  partnership: IncrcContent["partnership"];
}) {
  const layout = resolveCollage(partnership.layout, partnership.shots.length);
  // Never more than the arrangement holds — `resolveCollage` has already picked
  // one that fits, so this only trims a list normalised against an older max.
  const shots = layout ? partnership.shots.slice(0, layout.cells) : [];

  const written = partnership.label || partnership.title || partnership.body;
  if (!written && shots.length === 0) return null;

  return (
    <section id="partnership" className="shell py-16 sm:py-20">
      {/* `.pill-label` is a bordered, filled pill, so an empty one is a visible
          outline with nothing in it. Each line is drawn only when written, and
          its top margin goes with it. */}
      {written ? (
        <Reveal className="max-w-2xl">
          {partnership.label ? <span className="pill-label">{partnership.label}</span> : null}
          {partnership.title ? (
            <h2
              className={cn(
                "headline text-[clamp(1.7rem,3.6vw,2.7rem)]",
                partnership.label && "mt-4"
              )}
            >
              {partnership.title}
            </h2>
          ) : null}
          {partnership.body ? (
            <p
              className={cn(
                "body-copy",
                (partnership.label || partnership.title) && "mt-4"
              )}
            >
              {partnership.body}
            </p>
          ) : null}
        </Reveal>
      ) : null}

      {layout ? (
        <div
          className={cn("collage", written && "mt-10")}
          style={collageVars(layout) as React.CSSProperties}
        >
          {shots.map((shot, index) => (
            <Reveal
              key={`${shot.image}-${index}`}
              delay={Math.min(index, 5) * 0.08}
              // The Reveal is the grid child, so the cell it sits in goes here.
              style={{ "--collage-cell": cellName(index) } as React.CSSProperties}
              className="flex"
            >
              <figure className="group w-full overflow-hidden rounded-panel border border-line md:h-full">
                <img
                  src={shot.image}
                  alt={shot.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:aspect-auto md:h-full"
                />
              </figure>
            </Reveal>
          ))}
        </div>
      ) : null}
    </section>
  );
}
