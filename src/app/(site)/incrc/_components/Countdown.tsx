"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Time until a race weekend opens.
 *
 * Nothing is rendered on the server, and nothing on the first client render
 * either: the answer depends on the clock, and a clock read during rendering is
 * a different number on the server than in the browser a second later — which
 * React reports as a hydration error and then paints the stale one anyway. So
 * the first paint reserves the space and the number appears on the tick after
 * mount. That is one frame, and it is the only way this is honest.
 *
 * Ticks once a second only while there is something to count. Once the weekend
 * has started the interval is dropped, because a component that has said its
 * piece should not keep waking the tab up.
 */

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function remaining(target: Date, now: Date): Parts | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;

  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * The full clock: four cells, for the round the season is heading towards.
 *
 * The cells are translucent rather than solid because they sit over the
 * circuit's photograph — a solid panel there would read as a form dropped on a
 * picture, and the blur keeps them legible over whatever the photo is doing
 * underneath without hiding it.
 */
export function Countdown({ target, className }: { target: Date; className?: string }) {
  const [parts, setParts] = useState<Parts | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => setParts(remaining(target, new Date()));

    tick();
    setReady(true);

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  // Reserved, not collapsed: the card must not resize a frame after it paints.
  if (!ready) return <div aria-hidden className={cn("h-[76px]", className)} />;

  if (!parts) {
    return (
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-sm font-bold text-accent-ink",
          className
        )}
      >
        <span aria-hidden className="block size-2 animate-pulse rounded-full bg-accent-ink" />
        Race weekend under way
      </p>
    );
  }

  const cells: [number, string][] = [
    [parts.days, "Days"],
    [parts.hours, "Hrs"],
    [parts.minutes, "Min"],
    [parts.seconds, "Sec"],
  ];

  return (
    <div className={cn("flex gap-1.5 sm:gap-2", className)}>
      {cells.map(([value, label], index) => (
        <div
          key={label}
          className={cn(
            "min-w-[64px] flex-1 rounded-panel border px-2 py-2.5 text-center backdrop-blur-md sm:min-w-[76px]",
            // The days cell is the one people actually read; the rest are detail.
            index === 0
              ? "border-accent/40 bg-accent/15"
              : "border-white/15 bg-black/40"
          )}
        >
          <span
            className={cn(
              "block font-display text-[28px] font-extrabold leading-none tabular-nums sm:text-[34px]",
              index === 0 ? "text-accent" : "text-white"
            )}
          >
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The same count on one line, for the rounds that are not next. Every round gets
 * its own, so the whole season reads as a set of distances rather than only the
 * one at the front.
 */
export function CountdownLine({ target, className }: { target: Date; className?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const parts = remaining(target, new Date());

      if (!parts) {
        setText("Under way");
        return;
      }

      // Seconds are noise at this size — a round eleven weeks out does not need
      // to tick. Days until it is close, then hours, then minutes.
      if (parts.days > 0) setText(`in ${parts.days} day${parts.days === 1 ? "" : "s"}`);
      else if (parts.hours > 0) setText(`in ${parts.hours}h ${parts.minutes}m`);
      else setText(`in ${parts.minutes}m`);
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!text) return <span aria-hidden className={cn("inline-block h-4 w-16", className)} />;

  return (
    <span className={cn("font-semibold tabular-nums text-accent", className)}>{text}</span>
  );
}
