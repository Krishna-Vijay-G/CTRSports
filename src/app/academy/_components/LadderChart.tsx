"use client";

import { motion } from "framer-motion";

/**
 * Ascending ladder: rising bars + a gold arrow curving up to the F1 mark.
 * SIM RACE → TRAIN → COMPETE → PERFORM → FORMULA 1. Reveals on scroll.
 */
export function LadderChart({ nodes }: { nodes: string[] }) {
  const BASE = 300;
  const xs = [70, 160, 250, 340, 430];
  const heights = [48, 92, 140, 195, 246];
  const barW = 30;

  return (
    <svg
      viewBox="0 0 500 340"
      className="w-full h-auto"
      role="img"
      aria-label={`Driver progression ladder: ${nodes.join(" to ")}`}
    >
      {/* baseline */}
      <line x1="40" y1={BASE} x2="480" y2={BASE} stroke="#C7CEE0" strokeWidth="2" />

      {/* rising bars */}
      {heights.map((h, i) => (
        <motion.rect
          key={i}
          x={xs[i] - barW / 2}
          width={barW}
          rx={4}
          initial={{ height: 0, y: BASE }}
          whileInView={{ height: h, y: BASE - h }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.14, ease: "easeOut" }}
          fill="url(#barGrad)"
        />
      ))}

      {/* curved gold arrow */}
      <motion.path
        d="M50 302 C 150 296, 250 255, 320 165 C 358 118, 405 78, 456 52"
        fill="none"
        stroke="url(#goldStroke)"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 1.3, ease: "easeInOut" }}
      />
      <motion.path
        d="M456 52 l-16 1 M456 52 l-2 16"
        fill="none"
        stroke="#E29A00"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 1.2 }}
      />

      {/* nodes + labels */}
      {heights.map((h, i) => {
        const cx = xs[i];
        const cy = BASE - h - 10;
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.45, delay: 0.35 + i * 0.16 }}
          >
            <circle cx={cx} cy={cy} r="8" fill="#F4B400" stroke="#fff" strokeWidth="2.5" />
            <text
              x={cx}
              y={cy - 16}
              textAnchor="middle"
              className="font-display"
              fontSize={i === 4 ? 15 : 12.5}
              fontWeight={700}
              fill="#1B2A63"
            >
              {nodes[i]}
            </text>
          </motion.g>
        );
      })}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D5DAE8" />
          <stop offset="100%" stopColor="#EAEDF3" />
        </linearGradient>
        <linearGradient id="goldStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FBD11E" />
          <stop offset="55%" stopColor="#F4B400" />
          <stop offset="100%" stopColor="#E29A00" />
        </linearGradient>
      </defs>
    </svg>
  );
}
