"use client";

import { motion } from "framer-motion";
import type { Chapter } from "../../_data/biography";
import { ChapterFrame } from "./ChapterFrame";
import { ChapterHeader } from "../ChapterHeader";
import { PartnerLockup } from "../PartnerLockup";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { GoldDot, DiagonalWedge, SpeedStreaks } from "../Motifs";
import { cn } from "@/lib/utils";

function InstagramGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FollowButton({
  href,
  handle,
  tone = "navy",
}: {
  href: string;
  handle: string;
  tone?: "navy" | "light";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-3 rounded-full pl-4 pr-5 py-2.5 font-display font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:-translate-y-0.5",
        tone === "navy"
          ? "bg-ctr-navy text-white hover:shadow-card"
          : "border-2 border-white/40 text-white hover:border-ctr-gold"
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
        <InstagramGlyph className="w-[18px] h-[18px]" />
      </span>
      Follow the Championship
      <span className="text-ctr-gold group-hover:translate-x-0.5 transition-transform">{handle}</span>
    </a>
  );
}

export function NationalGridChapter({ chapter }: { chapter: Chapter }) {
  const inc = chapter.incrc;

  return (
    <ChapterFrame chapter={chapter} className="pt-20 md:pt-28">
      <div className="section-container relative">
        <Reveal>
          <ChapterHeader id={chapter.id} number={chapter.number} title={chapter.title} />
        </Reveal>

        {/* ── Intro split ── */}
        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal delay={0.05}>
              <PartnerLockup partners={chapter.partners || []} className="mb-6" />
            </Reveal>

            {inc && (
              <Reveal delay={0.08}>
                <p className="inline-flex items-center gap-2 font-display font-bold uppercase tracking-[0.18em] text-sm mb-4">
                  <span className="h-3 w-2 rounded-sm bg-[#FF9933]" />
                  <span className="h-3 w-2 rounded-sm bg-white ring-1 ring-ctr-navy/15" />
                  <span className="h-3 w-2 rounded-sm bg-[#138808]" />
                  <span className="text-ctr-navy ml-1">{inc.tagline}</span>
                </p>
              </Reveal>
            )}

            {chapter.partnersHeadline && (
              <Reveal delay={0.1}>
                <h3 className="font-heading font-semibold italic text-[clamp(1.4rem,3vw,2.1rem)] leading-snug text-ctr-navy max-w-xl">
                  {chapter.partnersHeadline}
                </h3>
              </Reveal>
            )}

            <RevealStagger as="ul" className="mt-7 space-y-5">
              {chapter.bullets?.map((b, i) => (
                <RevealItem as="li" key={i} className="flex gap-4">
                  <GoldDot />
                  <p className="body-copy">{b}</p>
                </RevealItem>
              ))}
            </RevealStagger>

            {inc && (
              <Reveal delay={0.15} className="mt-8">
                <FollowButton href={inc.instagram} handle={inc.handle} />
              </Reveal>
            )}
          </div>

          {/* Driver hero */}
          <Reveal className="relative" y={30} delay={0.1}>
            <SpeedStreaks className="scale-125" />
            <DiagonalWedge color="gold" corner="tl" className="w-20 h-20 opacity-90" style={{ left: -6, top: -6 }} />
            <div className="relative overflow-hidden rounded-2xl clip-diagonal-l shadow-card ring-1 ring-ctr-navy/10 bg-ctr-mist">
              {chapter.image ? (
                <img
                  src={chapter.image}
                  alt={chapter.imageAlt || ""}
                  className="h-full max-h-[560px] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </div>
          </Reveal>
        </div>

        {inc && (
          <>
            {/* ── Stat strip ── */}
            <RevealStagger className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-ctr-navy/10 md:grid-cols-4">
              {inc.stats.map((s) => (
                <RevealItem key={s.label} className="bg-ctr-navy px-6 py-8 text-center">
                  <span className="block font-display font-bold text-4xl md:text-5xl bg-gradient-to-b from-ctr-gold-light to-ctr-gold-deep bg-clip-text text-transparent">
                    {s.value}
                  </span>
                  <span className="mt-2 block text-[11px] uppercase tracking-[0.2em] text-white/70 font-display">
                    {s.label}
                  </span>
                </RevealItem>
              ))}
            </RevealStagger>

            {/* ── Our Vision ── */}
            {inc.vision?.length ? (
              <div className="mt-20">
                <Reveal className="text-center">
                  <p className="kicker">Our Vision</p>
                  <h3 className="mt-2 display-title text-[clamp(1.8rem,4vw,3rem)] text-ctr-navy">
                    New Era of Indian Motorsport
                  </h3>
                  <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-gold-gradient" />
                </Reveal>
                <RevealStagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {inc.vision.map((v) => (
                    <RevealItem key={v.label}>
                      <div className="h-full rounded-2xl border border-ctr-navy/10 bg-white p-6 shadow-card">
                        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-ctr-navy text-ctr-gold">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </span>
                        <p className="font-display font-bold uppercase tracking-wide text-ctr-navy text-sm leading-snug">
                          {v.label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-ctr-body/70">{v.description}</p>
                      </div>
                    </RevealItem>
                  ))}
                </RevealStagger>
              </div>
            ) : null}

            {/* ── One Nation, One Championship + the grid ── */}
            <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
              <Reveal y={30}>
                <figure className="relative overflow-hidden rounded-2xl shadow-card ring-1 ring-ctr-navy/10">
                  <img
  src={inc.oneNationImage}
  alt={inc.oneNationAlt}
  className="h-auto w-full"
  loading="lazy"
  decoding="async"
/>
                </figure>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="kicker mb-3">One Nation · One Championship</p>
                <h3 className="display-title text-[clamp(1.6rem,3.4vw,2.6rem)] text-ctr-navy">
                  A single grid for the whole country.
                </h3>
                <p className="body-copy mt-4 max-w-lg">
                  Seven racing categories — from Formula 4 to saloons, hatchbacks and touring
                  cars — line up together under one national banner, on India&apos;s finest circuits.
                </p>
                <div className="mt-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ctr-navy/10">
                  <img
  src={inc.carsImage}
  alt={inc.carsAlt}
  className="h-auto w-full"
  loading="lazy"
  decoding="async"
/>
                  <p className="mt-3 text-center text-xs font-display uppercase tracking-[0.18em] text-ctr-gold-deep">
                    {inc.oneNationVenue}
                  </p>
                </div>
              </Reveal>
            </div>

            {/* ── Championship Venues ── */}
            {inc.venues?.length ? (
              <div className="mt-20">
                <Reveal>
                  <p className="kicker">Championship Venues</p>
                  <h3 className="mt-2 display-title text-[clamp(1.8rem,4vw,3rem)] text-ctr-navy">
                    3 Iconic Circuits. One Championship.
                  </h3>
                </Reveal>
                <RevealStagger className="mt-8 grid gap-4 sm:grid-cols-3">
                  {inc.venues.map((venue) => (
                    <RevealItem key={venue.number}>
                      <div className="group relative overflow-hidden rounded-2xl bg-ctr-navy p-6 shadow-card transition-all duration-300 hover:-translate-y-1">
                        <span className="absolute inset-x-0 top-0 h-1 bg-gold-gradient" />
                        <p className="font-display text-[11px] uppercase tracking-[0.3em] text-ctr-gold mb-2">
                          Venue {venue.number}
                        </p>
                        <p className="font-display font-bold uppercase tracking-wide text-white text-lg leading-snug">
                          {venue.name}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60 font-display uppercase tracking-wider">
                          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {venue.city}
                        </p>
                      </div>
                    </RevealItem>
                  ))}
                </RevealStagger>
              </div>
            ) : null}

            {/* ── 2026 Calendar ── */}
            <div className="mt-20">
              <Reveal className="text-center">
                <p className="kicker">{inc.seasonKicker}</p>
                <h3 className="mt-2 display-title text-[clamp(1.8rem,4vw,3rem)] text-ctr-navy">
                  {inc.season}
                </h3>
                <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-gold-gradient" />
              </Reveal>

              <RevealStagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {inc.rounds.map((r) => (
                  <RevealItem key={r.round}>
                    <article
                      className={cn(
                        "group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5",
                        r.tba
                          ? "border-2 border-dashed border-ctr-navy/20 bg-transparent"
                          : "bg-white shadow-card ring-1 ring-ctr-navy/10 hover:shadow-card-hover"
                      )}
                    >
                      {!r.tba && <span className="absolute inset-x-0 top-0 h-1.5 bg-gold-gradient" />}
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[11px] uppercase tracking-[0.25em] text-ctr-gold-deep">
                          Round
                        </span>
                        <span
                          className={cn(
                            "font-display font-bold text-4xl leading-none",
                            r.tba ? "text-ctr-navy/25" : "text-ctr-navy"
                          )}
                        >
                          {r.round}
                        </span>
                      </div>
                      <p className="mt-5 font-display font-bold uppercase tracking-wide text-ctr-navy text-[15px]">
                        {r.dates}
                      </p>
                      <p className="mt-2 flex items-start gap-1.5 text-sm text-ctr-body">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-ctr-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        <span>
                          <span className={cn("font-semibold", r.tba && "text-ctr-body/60")}>{r.venue}</span>
                          {r.city && <span className="block text-ctr-body/60">{r.city}</span>}
                        </span>
                      </p>
                    </article>
                  </RevealItem>
                ))}
              </RevealStagger>
            </div>

            {/* ── The signing ── */}
            <div className="mt-20">
              <Reveal>
                <p className="kicker mb-2">Behind the Grid</p>
                <h3 className="display-title text-[clamp(1.6rem,3.4vw,2.6rem)] text-ctr-navy">
                  {inc.signingTitle}
                </h3>
                <p className="body-copy mt-3 max-w-2xl">{inc.signingText}</p>
              </Reveal>
              <RevealStagger className="mt-8 grid gap-4 sm:grid-cols-3">
                {inc.signing.map((s, i) => (
                  <RevealItem key={i}>
                    <figure className="group overflow-hidden rounded-2xl shadow-card ring-1 ring-ctr-navy/10">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={s.image}
                          alt={s.alt}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ctr-navy/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </figure>
                  </RevealItem>
                ))}
              </RevealStagger>
            </div>
          </>
        )}
      </div>

      {/* ── Motorsport family cinematic banner (full-bleed) ── */}
      {inc && (
        <div className="relative mt-20 w-full overflow-hidden">
          <div className="relative min-h-[420px] md:min-h-[520px]">
            <img
              src={inc.familyImage}
              alt={inc.familyAlt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ctr-navy-deep via-ctr-navy-deep/55 to-ctr-navy-deep/30" />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.7 }}
              className="section-container relative flex min-h-[420px] md:min-h-[520px] flex-col items-center justify-center py-16 text-center"
            >
              <p className="font-display font-semibold uppercase tracking-wide text-white/80 text-lg md:text-xl">
                {inc.familyLead}
              </p>
              <span className="my-4 flex items-center gap-3 text-ctr-gold">
                <span className="h-px w-10 bg-ctr-gold/50" />
                <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden>
                  <rect x="1" y="1" width="9" height="14" fill="#F4B400" />
                  <rect x="10" y="1" width="9" height="14" fill="#1B2A63" />
                  <path d="M1 1h4v3.5H1zM5 4.5h4V8H5zM9 8h4v3.5H9zM13 11.5h4V15h-4z" fill="#1B2A63" opacity="0.2" />
                </svg>
                <span className="h-px w-10 bg-ctr-gold/50" />
              </span>
              <p className="display-title text-white text-[clamp(1.8rem,5vw,3.6rem)] max-w-4xl">
                {inc.familyQuote}
              </p>
              <div className="mt-8">
                <FollowButton href={inc.instagram} handle={inc.handle} tone="light" />
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </ChapterFrame>
  );
}
