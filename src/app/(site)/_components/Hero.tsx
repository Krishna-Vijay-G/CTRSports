"use client";

import { motion, type Variants } from "framer-motion";
import { BRAND, HERO } from "@/config/site";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.14 * i, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/** Full-bleed opener: background photo, headline and one call to action. */
export function Hero() {
  return (
    <section className="relative flex min-h-[92svh] items-end overflow-hidden">
      <div className="absolute inset-0">
        {/* The page's LCP element — fetched at high priority, never lazily. */}
        <img
          src={HERO.background}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* Two gradients: one to seat the text at the bottom, one to keep the
            left-aligned copy legible over a busy photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/75 to-carbon-950/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon-950/85 via-carbon-950/25 to-transparent" />
      </div>

      <img
        src={BRAND.wordmark}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute right-4 top-24 h-auto w-24 select-none animate-float sm:right-10 sm:w-36 lg:w-44"
      />

      <div className="section-shell relative z-10 pb-14 pt-40 sm:pb-20">
        <motion.p custom={0} initial="hidden" animate="visible" variants={fadeUp} className="kicker">
          {HERO.kicker}
        </motion.p>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-2 font-display text-[clamp(2.4rem,7vw,5.2rem)] font-bold uppercase leading-[0.95] tracking-wide text-white"
        >
          {HERO.title}
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-4 max-w-xl whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {HERO.subtitle}
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8"
        >
          <a href={HERO.ctaHref} className="btn-yellow">
            {HERO.ctaLabel}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
