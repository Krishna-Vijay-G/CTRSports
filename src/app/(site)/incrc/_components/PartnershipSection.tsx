import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";

/**
 * How the championship came about: the signing.
 *
 * A collage rather than a row of equal tiles — the first photograph takes the
 * full height beside the copy and the rest stack next to it. Equal thirds would
 * say "three photographs"; this says "here is the moment, and here are two more
 * from it".
 */
export function PartnershipSection({
  partnership,
}: {
  partnership: IncrcContent["partnership"];
}) {
  const [lead, ...rest] = partnership.shots;

  return (
    <section id="partnership" className="shell py-16 sm:py-20">
      <Reveal className="max-w-2xl">
        <span className="pill-label">{partnership.label}</span>
        <h2 className="headline mt-4 text-[clamp(1.7rem,3.6vw,2.7rem)]">{partnership.title}</h2>
        <p className="body-copy mt-4">{partnership.body}</p>
      </Reveal>

      {lead ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Reveal className="flex">
            <Shot shot={lead} className="lg:aspect-auto lg:h-full" />
          </Reveal>

          {rest.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {rest.map((shot, index) => (
                <Reveal key={shot.image} delay={(index + 1) * 0.08} className="flex">
                  <Shot shot={shot} />
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Shot({
  shot,
  className,
}: {
  shot: IncrcContent["partnership"]["shots"][number];
  className?: string;
}) {
  return (
    <figure className="group w-full overflow-hidden rounded-panel border border-line">
      <img
        src={shot.image}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
        className={`aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105 ${className ?? ""}`}
      />
    </figure>
  );
}
