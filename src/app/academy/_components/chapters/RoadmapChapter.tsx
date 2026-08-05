import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { GoldTrackLine } from "../GoldTrackLine";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

export function RoadmapChapter({ chapter }: { chapter: Chapter }) {
  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
            dark
          />
        </Reveal>

        {/* 4-stage winding flow */}
        <div className="relative mt-14">
          <GoldTrackLine className="hidden lg:block absolute inset-x-0 top-6 h-40 w-full opacity-90" />

          <RevealStagger className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {chapter.stages?.map((stage, i) => (
              <RevealItem
                key={i}
                className={cn("relative", i % 2 === 1 && "lg:mt-24")}
              >
                {/* Flag pennant banner */}
                <div
                  className="relative bg-gold-gradient text-ctr-navy pl-4 pr-9 py-3 min-h-[3.75rem] flex items-center shadow-gold"
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 91% 50%, 100% 100%, 0 100%)",
                  }}
                >
                  <span className="font-display font-bold uppercase tracking-wide text-xs leading-tight block">
                    <span className="text-ctr-navy/60 mr-1.5">{i + 1}.</span>
                    {stage.title}
                  </span>
                </div>
                <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
                  <p className="text-sm leading-relaxed text-white/75">{stage.text}</p>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>

        {/* Callouts */}
        <RevealStagger className="mt-16 grid gap-5 md:grid-cols-3">
          {chapter.callouts?.map((c) => (
            <RevealItem key={c.title}>
              <div className="h-full rounded-2xl border border-ctr-gold/30 bg-ctr-navy-800/60 p-6">
                <h3 className="font-display font-bold uppercase tracking-[0.15em] text-ctr-gold text-sm mb-3">
                  {c.title}
                </h3>
                <div className="w-8 h-[2px] bg-gold-gradient mb-3" />
                <p className="text-white/80 leading-relaxed">{c.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </ChapterFrame>
  );
}
