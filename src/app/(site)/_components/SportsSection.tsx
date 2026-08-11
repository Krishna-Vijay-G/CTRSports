"use client";

import { useRef } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { SPORTS_SECTION } from "@/config/site";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";

/**
 * One sport: crest on one side, copy on the other, alternating down the rail.
 *
 * The crest drifts against the scroll and tilts toward the cursor. Both are
 * cosmetic — the row reads correctly with neither, and both are disabled by the
 * reduced-motion media query in globals.css only insofar as CSS can; Framer
 * handles the rest.
 */
function SportRow({ sport, index }: { sport: Sport; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const logoY = useTransform(scrollYProgress, [0, 1], [48, -48]);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.5 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.5 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 28);
    rotateX.set(py * -28);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const reversed = index % 2 === 1;

  return (
    <div
      ref={ref}
      role="listitem"
      className={cn(
        "flex flex-col items-center gap-8 p-6 sm:p-10 md:gap-14",
        reversed ? "md:flex-row-reverse" : "md:flex-row"
      )}
    >
      <div className="flex flex-1 items-center justify-center py-6 md:py-0" style={{ perspective: 700 }}>
        <motion.div
          style={{
            y: logoY,
            rotateX: springRotateX,
            rotateY: springRotateY,
            transformPerspective: 700,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="will-change-transform"
        >
          {sport.logo_url ? (
            <img
              src={sport.logo_url}
              alt={`${sport.title} logo`}
              loading="lazy"
              decoding="async"
              className="h-44 w-44 object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.5)] sm:h-56 sm:w-56 md:h-64 md:w-64"
            />
          ) : (
            // No logo uploaded yet — a monogram beats a broken-image icon.
            <div
              aria-hidden
              className="flex h-44 w-44 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] font-display text-5xl font-bold text-white/20 sm:h-56 sm:w-56 md:h-64 md:w-64"
            >
              {sport.title.slice(0, 1).toUpperCase() || "?"}
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 text-center md:text-left">
        <span className="font-display text-xs font-bold tracking-[0.3em] text-racing-yellow/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-display text-2xl font-semibold uppercase leading-tight tracking-wide text-white sm:text-3xl">
          {sport.title}
        </h3>
        {sport.text ? (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-racing-yellow">
            {sport.text}
          </p>
        ) : null}
        {sport.details ? (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/55 md:mx-0">
            {sport.details}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The sports rail. Renders nothing at all when the list is empty — a heading
 * over an empty rail reads as a broken page, and an empty list is what a
 * database outage looks like from here.
 */
export function SportsSection({ sports }: { sports: Sport[] }) {
  if (sports.length === 0) return null;

  return (
    <section id="sports" className="section-shell py-20 sm:py-24">
      <SectionHeading kicker={SPORTS_SECTION.kicker} title={SPORTS_SECTION.title} />

      <div role="list" className="relative mt-6">
        <div
          aria-hidden
          className="absolute bottom-0 left-1/2 top-0 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent md:block"
        />
        {sports.map((sport, index) => (
          <Reveal key={sport.id} y={36} className="border-b border-white/5 last:border-b-0">
            <SportRow sport={sport} index={index} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
