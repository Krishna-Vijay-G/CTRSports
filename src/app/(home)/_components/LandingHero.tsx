"use client";

import { motion, type Variants } from "framer-motion";
import type { LandingContent } from "@/lib/landingContent";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.14 * i, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/** Full-bleed opening section: background photo, headline, about card and CTA. */
export function LandingHero({ hero }: { hero: LandingContent["hero"] }) {
  return (
    <section className="relative flex min-h-[92svh] items-end overflow-hidden" id="about">
      <div className="absolute inset-0">
        {/* The page's LCP element — fetched at high priority, never lazily. */}
        <img
          src={hero.background_image}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/75 to-carbon-950/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon-950/85 via-carbon-950/25 to-transparent" />
      </div>

      <img
        src="/images/logos/CTR_yellow.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-4 top-24 w-24 select-none animate-float sm:right-10 sm:w-36 lg:w-44 h-auto"
        loading="lazy"
        decoding="async"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-14 pt-40 sm:px-6 sm:pb-20">
        <motion.p
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow"
        >
          {hero.kicker}
        </motion.p>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-2 font-display text-[clamp(2.4rem,7vw,5.2rem)] font-bold uppercase leading-[0.95] tracking-wide text-white"
        >
          {hero.title}
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-4 max-w-xl whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {hero.subtitle}
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 max-w-xl rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-sm"
        >
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-racing-yellow sm:text-xl">
            {hero.about_title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">{hero.about_body}</p>
        </motion.div>

        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 flex flex-wrap gap-4"
        >
          <a
            href="#sports"
            className="inline-flex items-center gap-2 rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-semibold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] active:translate-y-0"
          >
            {hero.cta_label}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
