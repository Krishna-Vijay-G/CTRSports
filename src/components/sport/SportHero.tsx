"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { SportMeta } from "@/lib/sports";

/** How far the pointer tilts the logo, in degrees at the edge of the hero. */
const TILT_DEGREES = 26;

/**
 * The centrepiece of a sport page: the crest, tilting toward the pointer and
 * pushing away from the viewer as the page scrolls.
 *
 * Three layers move at three speeds — glow slowest, stripes in between, crest
 * fastest — which is what reads as depth rather than a single sliding image.
 * `prefers-reduced-motion` freezes all of it.
 */
export function SportHero({ sport }: { sport: SportMeta }) {
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Parallax: each layer travels a different distance over the same scroll.
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const stripesY = useTransform(scrollYProgress, [0, 1], ["0%", "42%"]);
  const crestY = useTransform(scrollYProgress, [0, 1], ["0%", "78%"]);
  // Zoom: the crest grows as it leaves, then fades before it can clip the banner.
  const crestScale = useTransform(scrollYProgress, [0, 1], [1, 1.45]);
  const crestOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const hoverScale = useMotionValue(1);
  const spring = { stiffness: 150, damping: 18, mass: 0.6 };
  const springRotateX = useSpring(rotateX, spring);
  const springRotateY = useSpring(rotateY, spring);
  const springHoverScale = useSpring(hoverScale, { stiffness: 180, damping: 20 });

  // Tracked across the whole hero, not just the crest — the tilt should answer
  // the pointer anywhere on screen, not only on a direct hover.
  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * TILT_DEGREES);
    rotateX.set(py * -TILT_DEGREES);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    hoverScale.set(1);
  }

  const still = Boolean(reducedMotion);

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-labelledby="sport-hero-title"
      className="relative flex min-h-[86svh] items-center justify-center overflow-hidden bg-carbon-950"
    >
      <motion.div
        aria-hidden
        style={still ? undefined : { y: glowY }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(247,214,25,0.16)_0%,rgba(247,214,25,0.04)_34%,rgba(10,10,10,0)_66%)]"
      />
      <motion.div
        aria-hidden
        style={still ? undefined : { y: stripesY }}
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0px,transparent_62px,rgba(255,255,255,0.025)_62px,rgba(255,255,255,0.025)_63px)]"
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center px-5 py-24 text-center sm:px-6">
        <div style={{ perspective: 900 }}>
          <motion.div
            style={still ? undefined : { y: crestY, scale: crestScale, opacity: crestOpacity }}
            className="will-change-transform"
          >
            <motion.div
              onMouseEnter={() => !reducedMotion && hoverScale.set(1.07)}
              onMouseLeave={() => hoverScale.set(1)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={
                still
                  ? undefined
                  : {
                      rotateX: springRotateX,
                      rotateY: springRotateY,
                      scale: springHoverScale,
                      transformPerspective: 900,
                    }
              }
              className="will-change-transform"
            >
              <img
                src={sport.logo}
                alt={`${sport.name} crest`}
                className="h-48 w-48 object-contain drop-shadow-[0_28px_60px_rgba(0,0,0,0.65)] sm:h-64 sm:w-64 lg:h-80 lg:w-80"
              />
            </motion.div>
          </motion.div>
        </div>

        <motion.div style={still ? undefined : { opacity: copyOpacity }} className="mt-10">
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-racing-yellow">
            {sport.team}
          </p>
          <h1
            id="sport-hero-title"
            className="mt-3 font-display text-[clamp(2.2rem,7vw,4.6rem)] font-bold uppercase leading-[0.95] tracking-wide text-white"
          >
            {sport.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            {sport.tagline}
          </p>
        </motion.div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-carbon-950 to-transparent"
      />
    </section>
  );
}
