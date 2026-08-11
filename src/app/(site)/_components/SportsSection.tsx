import { SPORTS_SECTION } from "@/config/site";
import { sportPhoto } from "@/config/images";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Sport } from "@/lib/sports";

/**
 * The sports grid: one card per programme, photo on top, crest badged over it.
 *
 * Photo comes from the placeholder set in src/config/images.ts, by position;
 * everything else — crest, title, text, details — is the database row the admin
 * edits. Cards are not links: a sport has nowhere to go until it has a page of
 * its own.
 */
export function SportsSection({ sports }: { sports: Sport[] }) {
  // A heading over an empty grid reads as a broken page, and an empty list is
  // also what a database outage looks like from here.
  if (sports.length === 0) return null;

  return (
    <section id="sports" className="shell py-16 sm:py-20">
      <SectionHeading label={SPORTS_SECTION.label} title={SPORTS_SECTION.title} />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sports.map((sport, index) => (
          <Reveal key={sport.id} delay={0.06 * (index % 3)} y={28} className="h-full">
            <article className="panel-card flex h-full flex-col p-2.5">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={sportPhoto(sport.title, index)}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="h-48 w-full object-cover"
                />

                {sport.logo_url ? (
                  <span className="absolute left-3 top-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-md">
                    <img
                      src={sport.logo_url}
                      alt={`${sport.title} crest`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col px-2.5 pb-2 pt-4">
                <h3 className="font-display text-lg font-bold leading-snug tracking-[-0.01em] text-fg">
                  {sport.title}
                </h3>

                {sport.text ? (
                  <p className="mt-1.5 w-fit rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {sport.text}
                  </p>
                ) : null}

                {sport.details ? (
                  <p className="body-copy mt-3 text-[13px]">{sport.details}</p>
                ) : null}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
