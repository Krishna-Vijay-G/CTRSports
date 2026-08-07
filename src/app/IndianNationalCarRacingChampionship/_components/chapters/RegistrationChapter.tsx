import Link from "next/link";
import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { RACE_CATEGORY_LIST } from "@/lib/raceCategories";

/** Closing "Race With CTR" slide — the categories on offer, and a CTA to the entry form. */
export function RegistrationChapter({ chapter }: { chapter: Chapter }) {
  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
            kicker={chapter.kicker}
            dark
          />
        </Reveal>

        {chapter.lead ? (
          <Reveal delay={0.05}>
            <p className="body-copy mt-6 max-w-2xl text-white/80">{chapter.lead}</p>
          </Reveal>
        ) : null}

        <RevealStagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RACE_CATEGORY_LIST.map((category) => (
            <RevealItem key={category.id}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-ctr-gold/50 hover:bg-white/[0.08]">
                <p className="font-display text-sm font-bold uppercase leading-snug tracking-wide text-white">
                  {category.name}
                </p>
                <p className="mt-3 font-display text-[11px] uppercase tracking-[0.2em] text-ctr-gold">
                  {category.rounds} Rounds · {category.races} Races
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {chapter.ctas?.length ? (
          <Reveal className="mt-14 flex justify-center" delay={0.1}>
            <div className="flex flex-col items-center gap-3">
              {chapter.ctas.map((cta) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className={cta.kind === "gold" ? "btn-gold" : "btn-ghost-light"}
                >
                  {cta.label}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8h9M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </Reveal>
        ) : null}
      </div>
    </ChapterFrame>
  );
}
