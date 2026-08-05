"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import type { LandingContent, Sport } from "@/lib/landingContent";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

function isInternal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

/** One sport: crest on one side, copy on the other, alternating down the rail. */
function SportRow({ sport, index }: { sport: Sport; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const logoY = useTransform(scrollYProgress, [0, 1], [48, -48]);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.5 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.5 });

  function handleLogoMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 28);
    rotateX.set(py * -28);
  }

  function handleLogoMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const internal = isInternal(sport.website_url);
  const disabled = sport.website_url === "#";
  const reversed = index % 2 === 1;

  const inner = (
    <>
      <div className="flex flex-1 items-center justify-center py-6 md:py-0" style={{ perspective: 700 }}>
        <motion.div
          style={{ y: logoY, rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 700 }}
          onMouseMove={handleLogoMouseMove}
          onMouseLeave={handleLogoMouseLeave}
          className="will-change-transform"
        >
          <img
            src={sport.logo_image}
            alt={`${sport.name} logo`}
            loading="lazy"
            decoding="async"
            className="h-44 w-44 object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.5)] sm:h-56 sm:w-56 md:h-64 md:w-64"
          />
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 text-center md:text-left">
        <span className="font-display text-xs font-bold tracking-[0.3em] text-racing-yellow/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-display text-2xl font-semibold uppercase leading-tight tracking-wide text-white sm:text-3xl">
          {sport.name}
        </h3>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-racing-yellow">{sport.team_name}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-white/55 md:mx-0">{sport.description}</p>
        <span className="mx-auto mt-2 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-racing-yellow md:mx-0">
          {sport.visit_label}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </>
  );

  const sharedClass = cn(
    "group relative flex flex-col items-center gap-8 rounded-3xl border border-transparent p-6 no-underline transition-colors duration-300 hover:border-white/10 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-racing-yellow focus-visible:outline-offset-2 sm:p-10 md:gap-14",
    reversed ? "md:flex-row-reverse" : "md:flex-row"
  );

  return (
    <div ref={ref}>
      {internal ? (
        <Link role="listitem" href={sport.website_url} className={sharedClass} aria-label={`Open ${sport.name}`}>
          {inner}
        </Link>
      ) : (
        <a
          role="listitem"
          href={disabled ? undefined : sport.website_url}
          target={disabled ? undefined : "_blank"}
          rel={disabled ? undefined : "noreferrer"}
          className={sharedClass}
          aria-label={`Open ${sport.name} website`}
          aria-disabled={disabled || undefined}
        >
          {inner}
        </a>
      )}
    </div>
  );
}

/**
 * The sports rail. Renders nothing when every sport has been removed in the
 * admin — a heading over an empty rail reads as a broken page.
 */
export function SportsSection({
  heading,
  sports,
}: {
  heading: LandingContent["sports_section"];
  sports: Sport[];
}) {
  if (sports.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24" id="sports">
      <Reveal className="max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
          {heading.kicker}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
          {heading.title}
        </h2>
      </Reveal>

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
