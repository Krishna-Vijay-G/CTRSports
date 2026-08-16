import type { SectionViewProps } from "@/lib/sections/types";
import type { Rows } from "./model";
import { ArrowIcon } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The bulletin: one line per item, stacked.
 *
 * A list of rows rather than cards because these are announcements, not
 * features — a reader scans the left-hand tag, reads the line and moves on. The
 * whole row is the link, so there is no "read more" to aim at.
 *
 * The separators are borders on the rows themselves rather than a gap, which is
 * what makes the stack read as one board.
 */
export function RowsView({ value: rows }: SectionViewProps<Rows>) {
  if (rows.items.length === 0) return null;

  return (
    <section id="rows" className="shell py-16 sm:py-20">
      <SectionHeading label={rows.label} title={rows.title} layout="split" />

      <ul className="mt-10 overflow-hidden rounded-panel border border-line bg-panel">
        {rows.items.map((row, index) => (
          <li key={row.id} className={index > 0 ? "border-t border-line" : undefined}>
            <Reveal delay={Math.min(index, 5) * 0.05}>
              <a
                href={row.href}
                className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-5 transition-colors duration-300 hover:bg-surface/70 sm:px-7"
              >
                {row.label ? (
                  <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    {row.label}
                  </span>
                ) : null}

                <span className="min-w-0 flex-1 font-display text-[15px] font-bold leading-snug text-fg sm:text-base">
                  {row.title}
                </span>

                {row.meta ? (
                  <span className="shrink-0 text-xs text-fg-faint">{row.meta}</span>
                ) : null}

                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-fg-faint transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink"
                >
                  <ArrowIcon />
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
