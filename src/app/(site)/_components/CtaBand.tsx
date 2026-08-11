import { CTA_BAND } from "@/config/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import type { Sport } from "@/lib/sports";

/**
 * The accent band before the footer.
 *
 * The crests scattered behind the copy are the real sport logos rather than
 * stock artwork — the same trick the reference design plays with footballs, but
 * with assets we own. They are decorative only, so they carry no alt text and
 * vanish on small screens where they would crowd the words.
 */

/** Where each scattered crest sits. Positions are hand-placed to avoid the copy. */
const SCATTER = [
  "left-[4%] top-[16%] h-14 w-14 -rotate-12",
  "left-[13%] bottom-[14%] h-10 w-10 rotate-6",
  "left-[26%] top-[8%] h-9 w-9 rotate-12",
  "right-[5%] top-[20%] h-16 w-16 rotate-12",
  "right-[15%] bottom-[12%] h-11 w-11 -rotate-6",
  "right-[27%] top-[10%] h-9 w-9 -rotate-12",
];

export function CtaBand({ sports }: { sports: Sport[] }) {
  const crests = sports.filter((sport) => sport.logo_url).slice(0, SCATTER.length);

  return (
    <section className="shell pb-16 sm:pb-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-card bg-accent px-6 py-16 text-center sm:px-10 sm:py-20">
          {crests.map((sport, index) => (
            <img
              key={sport.id}
              src={sport.logo_url}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className={`pointer-events-none absolute hidden select-none object-contain drop-shadow-md sm:block ${SCATTER[index]}`}
            />
          ))}

          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-accent-ink px-4 py-1.5 text-[11px] font-semibold tracking-wide text-white">
              {CTA_BAND.label}
            </span>

            <h2 className="headline mt-5 text-[clamp(1.6rem,3.4vw,2.5rem)] text-accent-ink">{CTA_BAND.title}</h2>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-accent-ink/70">
              {CTA_BAND.body}
            </p>

            <div className="mt-7 flex justify-center">
              <ActionButton href={CTA_BAND.cta.href} variant="white">
                {CTA_BAND.cta.label}
              </ActionButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
