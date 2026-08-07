"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { biography } from "../_data/biography";
import { RevealStagger, RevealItem } from "@/components/ui/Reveal";

function Counter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [display, setDisplay] = useState(value.replace(/[0-9]/g, "0"));

  useEffect(() => {
    if (!inView) return;
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setDisplay(value);
      return;
    }
    const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
    const suffix = value.replace(/^[^0-9]*[0-9]+/, "");
    const target = parseInt(digits, 10);
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${prefix}${Math.round(eased * target)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <span className="block font-display font-bold text-4xl md:text-5xl lg:text-6xl bg-gradient-to-b from-ctr-gold-light to-ctr-gold-deep bg-clip-text text-transparent">
        {display}
      </span>
      <span className="mt-2 block text-[11px] md:text-xs uppercase tracking-[0.22em] text-white/70 font-display">
        {label}
      </span>
    </div>
  );
}

/** Headline number band bridging the hero into the story. */
export function StatsBand() {
  return (
    <section aria-label="Chennai Turbo Riders by the numbers" className="relative bg-ctr-navy py-12 md:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(244,180,0,0.12)_0%,transparent_60%)]" />
      <RevealStagger className="section-container relative grid grid-cols-2 gap-8 md:grid-cols-4">
        {biography.stats.map((s) => (
          <RevealItem key={s.label}>
            <Counter value={s.value} label={s.label} />
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
