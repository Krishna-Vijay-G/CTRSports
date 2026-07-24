"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

/** Single block: fades + rises into view (respects reduced-motion via CSS/Framer). */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 48,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "section" | "span";
}) {
  const M = motion[as] as typeof motion.div;
  return (
    <M
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.6, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </M>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

/** Wrapper that staggers its RevealItem children. */
export function RevealStagger({
  children,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
}) {
  const M = motion[as] as typeof motion.div;
  return (
    <M
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12%" }}
      className={className}
    >
      {children}
    </M>
  );
}

export function RevealItem({
  children,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const M = motion[as] as typeof motion.div;
  return (
    <M variants={childVariants} className={cn(className)}>
      {children}
    </M>
  );
}
