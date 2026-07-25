"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
 * Recurring deck signatures, built as reusable elements.
 * ───────────────────────────────────────────────────────────── */

/** Numbered chevron pennant chip (gold fill, navy text) — deck motif #1. */
export function NumberTab({
  number,
  dark = false,
  className = "",
}: {
  number: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center pl-3 pr-5 py-1 font-display font-bold text-sm tracking-wider",
        dark ? "bg-ctr-gold text-ctr-navy" : "bg-ctr-gold text-ctr-navy",
        className
      )}
      style={{ clipPath: "polygon(0 0, 100% 0, 82% 50%, 100% 100%, 0 100%)" }}
      aria-hidden
    >
      {number}
    </span>
  );
}

/** Gold vertical title bar + heavy condensed heading — deck motif #2. */
export function GoldTitle({
  children,
  id,
  dark = false,
  className = "",
  as = "h2",
}: {
  children: React.ReactNode;
  id?: string;
  dark?: boolean;
  className?: string;
  as?: "h1" | "h2";
}) {
  const Tag = as;
  return (
    <div className={cn("flex items-stretch gap-4", className)}>
      <span
        aria-hidden
        className="w-[6px] shrink-0 rounded-full bg-gold-gradient self-stretch"
      />
      <Tag
        id={id}
        className={cn(
          "display-title text-[clamp(2.1rem,5.2vw,4.6rem)]",
          dark ? "text-white" : "text-ctr-navy"
        )}
      >
        {children}
      </Tag>
    </div>
  );
}

/** Animated forward gold chevrons »»»» — deck motif #3 (keep-scrolling cue). */
export function ChevronRun({
  count = 7,
  className = "",
  size = 16,
}: {
  count?: number;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-hidden
      style={{ gap: size * 0.15 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 16 16"
          className="animate-chevron-run"
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          <path
            d="M4 2l6 6-6 6"
            fill="none"
            stroke="#F4B400"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/** Triple-chevron /// accent — deck motif #5. */
export function TripleChevron({ className = "" }: { className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <svg key={i} width="10" height="16" viewBox="0 0 10 16">
          <path
            d="M2 2l5 6-5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/** Thin yellow bottom accent strip per chapter — deck motif #5. */
export function FooterStrip({ text }: { text: string }) {
  return (
    <div className="relative mt-14">
      <div className="flex items-center gap-3 bg-ctr-yellow text-ctr-navy px-5 sm:px-7 py-3.5 rounded-r-lg rounded-l-sm">
        <TripleChevron className="text-ctr-navy shrink-0" />
        <span className="font-display font-bold uppercase tracking-wide text-sm sm:text-base">
          {text}
        </span>
        <span className="ml-auto hidden sm:inline font-display font-semibold text-[11px] tracking-[0.25em] text-ctr-navy/70">
          CHENNAI TURBO RIDERS
        </span>
      </div>
    </div>
  );
}

/** Corner clip-path wedge (navy / gold) — deck motif #4. */
export function DiagonalWedge({
  color = "navy",
  corner = "br",
  className = "",
  style,
}: {
  color?: "navy" | "gold";
  corner?: "br" | "bl" | "tr" | "tl";
  className?: string;
  style?: React.CSSProperties;
}) {
  const fill = color === "navy" ? "bg-ctr-navy" : "bg-gold-gradient";
  const clips: Record<string, string> = {
    br: "polygon(100% 0, 100% 100%, 0 100%)",
    bl: "polygon(0 0, 100% 100%, 0 100%)",
    tr: "polygon(0 0, 100% 0, 100% 100%)",
    tl: "polygon(0 0, 100% 0, 0 100%)",
  };
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute", fill, className)}
      style={{ clipPath: clips[corner], ...style }}
    />
  );
}

/** Gold bullet dot for lists — deck motif. */
export function GoldDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[0.45rem] h-2.5 w-2.5 shrink-0 rounded-full bg-gold-gradient shadow-[0_0_0_3px_rgba(244,180,0,0.15)]",
        className
      )}
    />
  );
}

/** Golden eagle "CTR" watermark, top-right of most chapters — deck motif #6. */
export function EagleWatermark({
  className = "",
  drift = true,
}: {
  className?: string;
  drift?: boolean;
}) {
  return (
    <motion.img
      src="/images/journey/CTR_yellow.png"
      alt=""
      aria-hidden
      initial={drift ? { y: -6, opacity: 0 } : false}
      whileInView={drift ? { y: 0, opacity: 1 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={cn(
        "pointer-events-none select-none absolute top-5 right-4 sm:right-8 w-24 sm:w-32 lg:w-40 drop-shadow-[0_6px_18px_rgba(244,180,0,0.35)]",
        className
      )}
    />
  );
}

/**
 * Renders body text with a phrase wrapped in the yellow marker bar.
 * Splits `text` on the first occurrence of `highlight`.
 */
export function MarkedText({
  text,
  highlight,
  className = "",
}: {
  text: string;
  highlight?: string;
  className?: string;
}) {
  if (!highlight || !text.includes(highlight)) {
    return <span className={className}>{text}</span>;
  }
  const [before, after] = text.split(highlight);
  return (
    <span className={className}>
      {before}
      <span className="marker">{highlight}</span>
      {after}
    </span>
  );
}

/** Faint diagonal speed streaks behind hero imagery — deck motif #7. */
export function SpeedStreaks({
  className = "",
  tone = "gold",
}: {
  className?: string;
  tone?: "gold" | "navy";
}) {
  const stroke = tone === "gold" ? "#F4B400" : "#1B2A63";
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 w-full h-full", className)}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {[10, 24, 38, 62, 78, 90].map((y, i) => (
        <line
          key={i}
          x1={-10}
          y1={y}
          x2={40}
          y2={y - 14}
          stroke={stroke}
          strokeWidth={i % 2 ? 0.5 : 0.9}
          opacity={0.18}
        />
      ))}
    </svg>
  );
}
