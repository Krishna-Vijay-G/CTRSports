import type { LandingContent } from "@/lib/landingContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Sport } from "@/lib/sports";

/**
 * The sports grid: one card per programme, photo on top, crest badged over it.
 *
 * Every field is the database row the admin edits, photo included — there is no
 * photo-per-sport mapping left in code, so reordering the list cannot put the
 * wrong picture on a card.
 *
 * Cards are not links: a sport has nowhere to go until it has a page of its own.
 */
export function SportsSection({
  heading,
  sports,
}: {
  heading: LandingContent["sportsSection"];
  sports: Sport[];
}) {
  // A heading over an empty grid reads as a broken page, and an empty list is
  // also what a database outage looks like from here.
  if (sports.length === 0) return null;

  return (
    <section id="sports" className="shell py-16 sm:py-20">
      <SectionHeading label={heading.label} title={heading.title} />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sports.map((sport, index) => (
          <Reveal key={sport.id} delay={0.06 * (index % 3)} y={28} className="h-full">
            <article className="panel-card flex h-full flex-col p-2.5">
              <div className="relative overflow-hidden rounded-2xl">
                {sport.photo_url ? (
                  <img
                    src={sport.photo_url}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  // No photo set — a flat tile keeps the card's proportions
                  // rather than collapsing the crest onto the copy.
                  <div aria-hidden className="h-48 w-full bg-page" />
                )}

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
