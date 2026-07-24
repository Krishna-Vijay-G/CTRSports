import type { Chapter } from "@/data/biographyData";
import ChapterFrame from "./ChapterFrame";
import ChapterHeader from "../ChapterHeader";
import { Reveal, RevealStagger, RevealItem } from "../Reveal";
import { GoldDot, FooterStrip, DiagonalWedge } from "../Motifs";

export default function ClubChapter({ chapter }: { chapter: Chapter }) {
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
          <div>
            <RevealStagger as="ul" className="space-y-6">
              {chapter.bullets?.map((b, i) => (
                <RevealItem as="li" key={i} className="flex gap-4">
                  <GoldDot />
                  <p className="body-copy">{b}</p>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>

          <Reveal className="relative lg:order-2" y={30} delay={0.1}>
            <DiagonalWedge
              color="navy"
              corner="tr"
              className="w-24 h-24 opacity-90"
              style={{ right: -8, top: -8 }}
            />
            <div className="relative overflow-hidden rounded-2xl clip-diagonal-l shadow-card ring-1 ring-ctr-navy/10">
              <img
                src={chapter.image}
                alt={chapter.imageAlt || ""}
                loading="lazy"
                className="h-full max-h-[560px] w-full object-cover"
              />
              <DiagonalWedge
                color="gold"
                corner="br"
                className="bottom-0 right-0 h-16 w-32 opacity-90"
              />
            </div>
          </Reveal>
        </div>

        {chapter.footerStrip && <FooterStrip text={chapter.footerStrip} />}
      </div>
    </ChapterFrame>
  );
}
