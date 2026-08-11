"use client";

import { motion, type Variants } from "framer-motion";
import { HERO } from "@/config/site";
import { ActionButton, ArrowIcon } from "@/components/ui/ActionButton";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { Sport } from "@/lib/sports";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.12 * i, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/** How many crests stack up in the proof line, and how many rows the card lists. */
const CREST_COUNT = 4;
const CARD_ROWS = 3;

/**
 * The opening panel: one photo, the nav over it, the headline bottom-left and a
 * card of programmes floating over the right.
 *
 * The card is real data — the first few sports straight from the database — so
 * it stays true as the list is edited, and disappears cleanly if the list is
 * empty.
 */
export function Hero({ sports }: { sports: Sport[] }) {
  const crests = sports.filter((sport) => sport.logo_url).slice(0, CREST_COUNT);
  const cardRows = sports.slice(0, CARD_ROWS);

  return (
    <section className="relative overflow-hidden rounded-card">
      {/* The page's LCP element — fetched at high priority, never lazily. */}
      <img
        src={HERO.background}
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Two washes: one to seat the copy against the bottom, one to hold the
          left-aligned headline legible. Kept deliberately light — heavy enough
          to read the type, not so heavy the stadium turns into a black panel. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />

      <SiteHeader />

      <div className="relative z-10 mx-auto flex min-h-[600px] max-w-[1180px] flex-col justify-end px-5 pb-8 pt-28 sm:px-8 sm:pb-10 lg:min-h-[680px]">
        <div className="lg:max-w-[52%]">
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="headline whitespace-pre-line text-[clamp(2.25rem,5.4vw,3.75rem)] text-white"
          >
            {HERO.headline}
          </motion.h1>

          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="mt-7">
            <ActionButton href={HERO.cta.href}>{HERO.cta.label}</ActionButton>
          </motion.div>
        </div>

        {crests.length > 0 ? (
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-12 flex items-center gap-3 lg:mt-16"
          >
            <div className="flex -space-x-2.5">
              {crests.map((sport) => (
                <span
                  key={sport.id}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white"
                >
                  <img
                    src={sport.logo_url}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-0.5"
                  />
                </span>
              ))}
            </div>
            <p className="max-w-[15rem] text-xs leading-snug text-white/70 sm:max-w-none sm:text-sm">
              {HERO.proof}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Floating card. Hidden below lg, where it would cover the headline. */}
      {cardRows.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute right-8 top-1/2 z-10 hidden w-[330px] -translate-y-1/2 rounded-panel bg-surface p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] lg:block"
        >
          <p className="font-display text-base font-bold text-fg">{HERO.card.title}</p>
          <p className="mt-0.5 text-xs text-fg-faint">{HERO.card.subtitle}</p>

          <ul className="mt-3 space-y-1 rounded-xl border border-line p-2">
            {cardRows.map((sport) => (
              <li key={sport.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                {/* White backing, like the crest stack below: these logos carry
                    their own dark ink and go muddy on a near-black tile. */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {sport.logo_url ? (
                    <img
                      src={sport.logo_url}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="font-display text-xs font-bold text-fg-faint">
                      {sport.title.slice(0, 1)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-fg">
                    {sport.title}
                  </span>
                  {sport.text ? (
                    <span className="block truncate text-[11px] text-fg-faint">{sport.text}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex justify-end">
            <a
              href={HERO.card.ctaHref}
              className="group inline-flex items-center gap-2 rounded-full bg-accent py-1 pl-4 pr-1 text-xs font-semibold text-accent-ink transition hover:bg-accent-dark"
            >
              {HERO.card.ctaLabel}
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-ink text-accent">
                <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </a>
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}
