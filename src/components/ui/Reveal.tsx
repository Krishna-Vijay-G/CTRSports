"use client";

import { motion } from "framer-motion";

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * Fades and lifts a block into view the first time it is scrolled to.
 *
 * The one animation primitive this project has. Reach for it instead of writing
 * a bespoke `motion.div` in a section — new sections then look like the old ones
 * for free.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.6, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
