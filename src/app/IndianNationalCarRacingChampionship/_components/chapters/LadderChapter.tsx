import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { LadderChart } from "../LadderChart";
import { Icon } from "../Icons";
import type { IconKey } from "../../_data/biography";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { FooterStrip } from "../Motifs";

const pointIcons: IconKey[] = ["people", "chart", "globe"];

export function LadderChapter({ chapter }: { chapter: Chapter }) {
  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
          />
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Points */}
          <div>
            <RevealStagger className="space-y-6">
              {chapter.bullets?.map((b, i) => (
                <RevealItem key={i} className="flex gap-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ctr-navy text-ctr-gold shadow-card">
                    <Icon name={pointIcons[i] ?? "wheel"} className="h-6 w-6" />
                  </span>
                  <p className="body-copy pt-1.5">{b}</p>
                </RevealItem>
              ))}
            </RevealStagger>

            {chapter.quote && (
              <Reveal className="mt-9" delay={0.1}>
                <blockquote className="flex gap-3">
                  <span aria-hidden className="font-display text-5xl leading-none text-ctr-gold">
                    &ldquo;
                  </span>
                  <p className="font-display font-bold uppercase tracking-wide text-2xl md:text-3xl text-ctr-navy self-center">
                    {chapter.quote}
                  </p>
                </blockquote>
              </Reveal>
            )}
          </div>

          {/* Ladder graphic */}
          <Reveal y={30} delay={0.1}>
            <div className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-card ring-1 ring-ctr-navy/10 overflow-hidden">
              <span
                aria-hidden
                className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-ctr-gold/10 blur-2xl"
              />
              <p className="kicker mb-4">The Ladder</p>
              <LadderChart nodes={chapter.ladder || []} />
            </div>
          </Reveal>
        </div>

        {chapter.footerStrip && <FooterStrip text={chapter.footerStrip} />}
      </div>
    </ChapterFrame>
  );
}
