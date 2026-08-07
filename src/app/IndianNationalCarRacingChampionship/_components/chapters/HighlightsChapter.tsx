import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { PartnerLockup } from "../PartnerLockup";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { GoldDot, FooterStrip, DiagonalWedge } from "../Motifs";

export function HighlightsChapter({ chapter }: { chapter: Chapter }) {
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

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal delay={0.05}>
              <PartnerLockup partners={chapter.partners || []} dark className="mb-8" />
            </Reveal>

            {chapter.lead && (
              <Reveal delay={0.08}>
                <p className="body-copy text-white/80 max-w-xl">{chapter.lead}</p>
              </Reveal>
            )}

            {chapter.highlightsTitle && (
              <Reveal delay={0.1}>
                <h3 className="mt-8 font-display font-bold uppercase tracking-wide text-xl text-ctr-gold">
                  {chapter.highlightsTitle}
                </h3>
              </Reveal>
            )}

            <RevealStagger as="ul" className="mt-5 space-y-4">
              {chapter.bullets?.map((b, i) => (
                <RevealItem as="li" key={i} className="flex gap-4">
                  <GoldDot />
                  <p className="body-copy text-white/85">{b}</p>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>

          <Reveal className="relative" y={30} delay={0.1}>
            <DiagonalWedge
              color="gold"
              corner="tr"
              className="w-20 h-20 opacity-90"
              style={{ right: -6, top: -6 }}
            />
            <div className="relative overflow-hidden rounded-2xl clip-diagonal-l shadow-card ring-1 ring-white/10">
              {chapter.image ? (
                <img
                  src={chapter.image}
                  alt={chapter.imageAlt || ""}
                  className="h-full max-h-[600px] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-tr from-ctr-navy-deep/40 to-transparent" />
            </div>
          </Reveal>
        </div>

        {chapter.footerStrip && <FooterStrip text={chapter.footerStrip} />}
      </div>
    </ChapterFrame>
  );
}
