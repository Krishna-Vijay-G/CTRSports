"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { Chapter } from "@/data/biographyData";
import { ChevronRun } from "../Motifs";

export default function JourneyHero({ chapter }: { chapter: Chapter }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
      className="relative min-h-[100svh] w-full overflow-hidden bg-ctr-navy-deep"
    >
      {/* Media layer */}
      <motion.div style={{ y: mediaY }} className="absolute inset-0 -z-10 scale-110">
        {chapter.video ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={chapter.poster}
            aria-hidden
          >
            <source src={chapter.video} type="video/mp4" />
          </video>
        ) : (
          <img src={chapter.image} alt="" className="h-full w-full object-cover" aria-hidden />
        )}
      </motion.div>

      {/* Scrims: keep text readable, lift the CTR light identity */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ctr-navy-deep/92 via-ctr-navy-deep/55 to-ctr-navy-deep/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ctr-navy-deep via-transparent to-ctr-navy-deep/40" />

      {/* Eagle watermark top-right */}
      <img
        src="/images/journey/logo-eagle-gold.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-24 right-5 sm:right-10 w-28 sm:w-40 lg:w-52 opacity-95 drop-shadow-[0_10px_30px_rgba(244,180,0,0.4)] animate-float"
      />

      <motion.div
        style={{ y: textY, opacity: fade }}
        className="section-container relative flex min-h-[100svh] flex-col justify-center pt-32 pb-28"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="flex items-center gap-3 kicker text-ctr-gold mb-6"
        >
          <span className="h-[2px] w-8 bg-gold-gradient" />
          {chapter.eyebrow}
        </motion.p>

        <h1 id={`${chapter.id}-title`} className="display-title text-white max-w-4xl">
          {chapter.titleLines?.map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.15 }}
              className="block text-[clamp(2.6rem,8vw,6rem)] leading-[0.95]"
            >
              {i === 1 ? (
                <span className="bg-gradient-to-r from-ctr-gold-light via-ctr-gold to-ctr-gold-deep bg-clip-text text-transparent">
                  {line}
                </span>
              ) : (
                line
              )}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-7 max-w-xl text-lg md:text-xl text-white/80 leading-relaxed"
        >
          {chapter.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-9 flex flex-wrap gap-4"
        >
          {chapter.ctas?.map((cta) => (
            <a
              key={cta.label}
              href={cta.href}
              className={cta.kind === "gold" ? "btn-gold" : "btn-ghost-light"}
              {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {cta.label}
              {cta.kind === "gold" && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </a>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#origin"
        style={{ opacity: fade }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 flex items-center gap-3 text-white/70"
        aria-label="Scroll to begin"
      >
        <ChevronRun count={7} size={14} />
        <span className="font-display uppercase tracking-[0.3em] text-[11px]">Scroll to begin</span>
      </motion.a>
    </section>
  );
}
