"use client";

import { motion } from "framer-motion";
import { usePreviewMode } from "@/components/ui/PreviewMode";

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
  style,
  delay = 0,
  y = 32,
}: {
  children: React.ReactNode;
  className?: string;
  /** For what a class cannot carry — a grid placement computed from data. */
  style?: React.CSSProperties;
  delay?: number;
  y?: number;
}) {
  // In the admin's preview pane nothing ever enters the window's viewport, so
  // the scroll trigger would never fire and the content would stay invisible.
  if (usePreviewMode()) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.6, delay, ease: easeOut }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
