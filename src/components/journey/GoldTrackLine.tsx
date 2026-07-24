"use client";

import { motion } from "framer-motion";

/** Serpentine gold "track" ribbon that draws itself in on scroll (roadmap motif). */
export default function GoldTrackLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <motion.path
        d="M20 170 C 180 170, 200 60, 340 60 C 470 60, 500 175, 640 175 C 780 175, 800 55, 940 55 C 1060 55, 1090 150, 1180 150"
        fill="none"
        stroke="url(#trackGold)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="2 20"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      <motion.path
        d="M20 170 C 180 170, 200 60, 340 60 C 470 60, 500 175, 640 175 C 780 175, 800 55, 940 55 C 1060 55, 1090 150, 1180 150"
        fill="none"
        stroke="url(#trackGold)"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      <defs>
        <linearGradient id="trackGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FBD11E" />
          <stop offset="50%" stopColor="#F4B400" />
          <stop offset="100%" stopColor="#E29A00" />
        </linearGradient>
      </defs>
    </svg>
  );
}
