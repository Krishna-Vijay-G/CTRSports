import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";

export function UnifiedChapter({ chapter }: { chapter: Chapter }) {
  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal className="text-center flex flex-col items-center">
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
            className="items-center"
          />
          {chapter.teamsCaption && (
            <p className="mt-4 font-heading italic text-lg text-ctr-gold-deep">
              {chapter.teamsCaption}
            </p>
          )}
        </Reveal>

        <RevealStagger className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {chapter.teams?.map((team) => (
            <RevealItem key={team.name}>
              <figure className="group flex h-full flex-col items-center rounded-2xl bg-white p-6 shadow-card ring-1 ring-ctr-navy/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-card-hover">
                <div className="flex h-32 w-full items-center justify-center">
                  <img
                    src={team.logo}
                    alt={`${team.name} emblem`}
                    loading="lazy"
                    className="max-h-32 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <figcaption className="mt-4 text-center font-display font-semibold uppercase tracking-wide text-xs text-ctr-navy">
                  {team.name}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </ChapterFrame>
  );
}
