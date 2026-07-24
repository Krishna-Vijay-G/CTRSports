import type { Chapter } from "@/data/biographyData";
import ChapterFrame from "./ChapterFrame";
import ChapterHeader from "../ChapterHeader";
import Icon from "../Icons";
import { Reveal, RevealStagger, RevealItem } from "../Reveal";
import { GoldDot, FooterStrip } from "../Motifs";

export default function AcademyChapter({ chapter }: { chapter: Chapter }) {
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

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start">
          {/* Lists */}
          <div className="space-y-10">
            <div>
              <h3 className="flex items-center gap-3 mb-4 font-display font-bold uppercase tracking-wide text-2xl text-ctr-navy">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ctr-navy text-ctr-gold">
                  <Icon name="wheel" className="h-6 w-6" />
                </span>
                {chapter.trainingTitle}
              </h3>
              <RevealStagger as="ul" className="grid sm:grid-cols-2 gap-x-8 gap-y-3 pl-1">
                {chapter.trainingList?.map((t) => (
                  <RevealItem as="li" key={t} className="flex items-center gap-3">
                    <GoldDot className="!mt-0" />
                    <span className="body-copy">{t}</span>
                  </RevealItem>
                ))}
              </RevealStagger>
            </div>

            <div>
              <h3 className="flex items-start gap-3 mb-4 font-display font-bold uppercase tracking-wide text-2xl text-ctr-navy">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ctr-navy text-ctr-gold">
                  <Icon name="handshake" className="h-6 w-6" />
                </span>
                <span className="pt-1">{chapter.collabTitle}</span>
              </h3>
              <RevealStagger as="ul" className="space-y-3 pl-1">
                {chapter.collabList?.map((t) => (
                  <RevealItem as="li" key={t} className="flex items-center gap-3">
                    <GoldDot className="!mt-0" />
                    <span className="body-copy">{t}</span>
                  </RevealItem>
                ))}
              </RevealStagger>
            </div>
          </div>

          {/* Image trio */}
          <RevealStagger className="grid grid-cols-3 gap-3 sm:gap-4">
            {chapter.academyTiles?.map((tile) => (
              <RevealItem key={tile.label}>
                <figure className="group overflow-hidden rounded-xl shadow-card ring-1 ring-ctr-navy/10">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={tile.image}
                      alt={tile.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <figcaption className="bg-ctr-yellow text-ctr-navy text-center py-2.5 px-1 font-display font-bold uppercase tracking-wide text-[11px] sm:text-sm">
                    {tile.label}
                  </figcaption>
                </figure>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>

        {chapter.quote && (
          <Reveal className="mt-14" delay={0.1}>
            <blockquote className="mx-auto max-w-3xl text-center">
              <span aria-hidden className="font-display text-5xl leading-none text-ctr-gold">
                &ldquo;
              </span>
              <p className="-mt-3 font-display font-semibold uppercase tracking-wide text-[clamp(1.2rem,2.6vw,1.9rem)] text-ctr-navy">
                {chapter.quote}
              </p>
            </blockquote>
          </Reveal>
        )}

        {chapter.footerStrip && <FooterStrip text={chapter.footerStrip} />}
      </div>
    </ChapterFrame>
  );
}
