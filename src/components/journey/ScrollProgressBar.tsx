"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin gold scroll-progress bar pinned to the very top of the page. */
export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[70] h-1 origin-left bg-gold-gradient"
      aria-hidden
    />
  );
}
