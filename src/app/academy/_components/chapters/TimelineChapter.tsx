"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { Icon } from "../Icons";
import { Reveal } from "@/components/ui/Reveal";
import { MarkedText, DiagonalWedge, FooterStrip } from "../Motifs";
import { cn } from "@/lib/utils";

export function TimelineChapter({ chapter }: { chapter: Chapter }) {
  const dark = chapter.theme === "dark";
  const mediaLeft = chapter.align === "left";

  const Media = (
    <Reveal
      className={cn("relative", mediaLeft ? "lg:order-1" : "lg:order-2")}
      y={30}
    >
      <div className="relative">
        <DiagonalWedge
          color="gold"
          corner={mediaLeft ? "tr" : "tl"}
          className="w-24 h-24 -z-0 opacity-90"
          {...(mediaLeft ? { style: { right: -8, top: -8 } } : {})}
        />
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl shadow-card ring-1 ring-ctr-navy/10",
            mediaLeft ? "clip-diagonal-r" : "clip-diagonal-l"
          )}
        >
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
          <DiagonalWedge
            color="navy"
            corner={mediaLeft ? "bl" : "br"}
            className="bottom-0 h-20 w-40 opacity-90"
            {...(mediaLeft ? { style: { left: 0 } } : { style: { right: 0 } })}
          />
        </div>
      </div>
    </Reveal>
  );

  return (
    <ChapterFrame chapter={chapter} className="py-20 md:py-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader
            id={chapter.id}
            number={chapter.number}
            title={chapter.title}
            kicker={chapter.kicker}
            dark={dark}
          />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          {mediaLeft && Media}

          <div className={cn(mediaLeft ? "lg:order-2" : "lg:order-1")}>
            <ol className="relative pl-2">
              {/* Draw-in gold spine */}
              <motion.span
                aria-hidden
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-20%" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute left-[27px] top-3 bottom-3 w-[3px] origin-top bg-gradient-to-b from-ctr-gold-light via-ctr-gold to-ctr-gold-deep rounded-full"
              />

              {chapter.timeline?.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-12%" }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.18, ease: "easeOut" }}
                  className="relative flex gap-5 pb-9 last:pb-0"
                >
                  <span
                    className={cn(
                      "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-card",
                      dark ? "bg-ctr-navy-800 text-ctr-gold" : "bg-ctr-navy text-ctr-gold"
                    )}
                  >
                    <Icon name={item.icon} className="h-6 w-6" />
                  </span>
                  <div className="pt-0.5">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className={cn(
                          "font-display font-bold text-2xl md:text-3xl tracking-wide",
                          dark ? "text-white" : "text-ctr-navy"
                        )}
                      >
                        {item.year}
                      </span>
                      {item.label && (
                        <span className="font-heading italic text-lg text-ctr-gold-deep">
                          {item.label}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-2 body-copy leading-relaxed",
                        dark && "text-white/75"
                      )}
                    >
                      <MarkedText text={item.text} highlight={item.highlight} />
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>

            {chapter.quote && (
              <Reveal className="mt-8" delay={0.1}>
                <p className="flex items-center gap-2 font-display font-bold uppercase tracking-wide text-xl text-ctr-navy">
                  <span aria-hidden className="text-ctr-gold text-3xl leading-none">
                    &ldquo;
                  </span>
                  {chapter.quote}
                </p>
              </Reveal>
            )}
          </div>

          {!mediaLeft && Media}
        </div>

        {chapter.footerStrip && <FooterStrip text={chapter.footerStrip} />}
      </div>
    </ChapterFrame>
  );
}
