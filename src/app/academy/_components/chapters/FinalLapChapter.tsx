import Image from "next/image";
import type { Chapter } from "../../_data/biography";
import { socials } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { GoldDot, DiagonalWedge, ChevronRun } from "../Motifs";

export function FinalLapChapter({ chapter }: { chapter: Chapter }) {
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

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <RevealStagger as="ul" className="space-y-6">
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
              corner="tl"
              className="w-20 h-20 opacity-90"
              style={{ left: -6, top: -6 }}
            />
            <div className="relative overflow-hidden rounded-2xl clip-diagonal-l shadow-card ring-1 ring-white/10">
              {chapter.image ? (
                <Image
                  src={chapter.image}
                  alt={chapter.imageAlt || ""}
                  width={1600}
                  height={1000}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-full max-h-[560px] w-full object-cover"
                />
              ) : null}
            </div>
          </Reveal>
        </div>

        {/* Closing CTA block */}
        <Reveal className="mt-20" delay={0.05}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ctr-navy-800 to-ctr-navy-deep p-10 sm:p-14 text-center ring-1 ring-ctr-gold/20">
            <ChevronRun className="justify-center mb-5" count={7} size={18} />
            <h3 className="display-title text-white text-[clamp(2rem,6vw,4rem)]">
              {chapter.closingHeadline?.split(" ").map((word, i, arr) => (
                <span key={i}>
                  {i >= arr.length - 2 ? (
                    <span className="bg-gradient-to-r from-ctr-gold-light to-ctr-gold-deep bg-clip-text text-transparent">
                      {word}{" "}
                    </span>
                  ) : (
                    <>{word} </>
                  )}
                </span>
              ))}
            </h3>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              {chapter.ctas?.map((cta) => (
                <a
                  key={cta.label}
                  href={cta.href}
                  className={cta.kind === "gold" ? "btn-gold" : "btn-ghost-light"}
                  {...(cta.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {cta.label}
                </a>
              ))}
            </div>

            {/* Follow CTR */}
            <div className="mt-9">
              <p className="kicker text-ctr-gold mb-3">Follow CTR</p>
              <div className="flex items-center justify-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} — ${s.handle}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/80 hover:border-ctr-gold hover:text-ctr-gold hover:scale-105 transition-all text-sm font-semibold uppercase"
                  >
                    {s.label.charAt(0)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </ChapterFrame>
  );
}
