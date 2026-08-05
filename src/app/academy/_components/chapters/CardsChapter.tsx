import Image from "next/image";
import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { Icon } from "../Icons";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { NumberTab } from "../Motifs";

export function CardsChapter({ chapter }: { chapter: Chapter }) {
  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
            chevrons
          />
        </Reveal>

        <RevealStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {chapter.cards?.map((card, i) => (
            <RevealItem key={i}>
              <article className="story-card group h-full overflow-hidden hover:-translate-y-1.5 hover:shadow-card-hover">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    width={800}
                    height={600}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 90vw"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ctr-navy/45 to-transparent" />
                  {/* Numbered chevron tab on the image */}
                  <NumberTab
                    number={`0${i + 1}`}
                    className="absolute top-4 left-0 shadow-gold"
                  />
                  {/* Gold icon medallion */}
                  <span className="absolute -bottom-6 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-ctr-navy shadow-gold ring-4 ring-white">
                    <Icon name={card.icon} className="h-6 w-6" />
                  </span>
                </div>
                <div className="p-6 pt-8">
                  <p className="body-copy text-[1.02rem]">{card.text}</p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealStagger>

        {chapter.quote && (
          <Reveal className="mt-16" delay={0.1}>
            <blockquote className="relative mx-auto max-w-3xl text-center">
              <span aria-hidden className="block font-display text-6xl leading-none text-ctr-gold">
                &ldquo;
              </span>
              <p className="-mt-4 font-display font-semibold uppercase tracking-wide text-[clamp(1.3rem,3vw,2.1rem)] text-ctr-navy">
                {chapter.quote}
              </p>
            </blockquote>
          </Reveal>
        )}
      </div>
    </ChapterFrame>
  );
}
