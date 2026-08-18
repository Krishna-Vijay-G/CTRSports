"use client";

import { cn } from "@/lib/utils";

/**
 * A ring that fills, or spins when there is nothing to fill it with.
 *
 * Two states in one shape, because an upload has two phases and a control that
 * only knew about one of them would have to lie about the other. While the file
 * is being decoded and re-encoded there is genuinely no percentage — the work
 * is happening on this machine and reports nothing — so the ring spins. Once
 * bytes are moving, `XMLHttpRequest` says how many, and it fills.
 *
 * A ring rather than a bar: it sits ON the picture it is replacing, in a tile
 * seventy-two pixels tall, where a bar would either span the tile edge to edge
 * (and read as a scrubber) or be too short to see moving.
 *
 * Colours come from the parent: the track is `currentColor` at a quarter
 * strength, so putting this on a dark scrim is a matter of the scrim setting
 * `text-white`. Only the filled arc is fixed, to the accent.
 */
export function ProgressRing({
  value,
  size = 44,
  stroke = 3.5,
  label = true,
  className,
}: {
  /** 0–100, or null for "working, and the number is not knowable yet". */
  value: number | null;
  size?: number;
  stroke?: number;
  /** The percentage inside the ring. Off for sizes too small to hold it. */
  label?: boolean;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamped rather than trusted: `loaded / total` can tip over 100 on a request
  // that gets retried, and a ring drawn past full looks broken.
  const percent = value === null ? null : Math.min(100, Math.max(0, Math.round(value)));

  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      // Absent while indeterminate, which is what tells a screen reader this is
      // busy with an unknown amount left rather than stuck at zero.
      aria-valuenow={percent ?? undefined}
      aria-label="Upload progress"
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
        // The spin replaces the quarter-turn: `animate-spin`'s keyframes set
        // `transform` outright, so the two cannot be combined anyway. Filling
        // starts at twelve o'clock, which is the only place it reads as a clock.
        className={percent === null ? "animate-spin" : "-rotate-90"}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          // A quarter of the ring, chased around by the spin, when there is no
          // number; the real arc when there is.
          strokeDasharray={
            percent === null ? `${circumference * 0.25} ${circumference}` : circumference
          }
          strokeDashoffset={percent === null ? 0 : circumference * (1 - percent / 100)}
          className="text-primary transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>

      {label && percent !== null ? (
        <span className="absolute text-[9px] font-semibold leading-none tabular-nums">
          {percent}%
        </span>
      ) : null}
    </span>
  );
}
