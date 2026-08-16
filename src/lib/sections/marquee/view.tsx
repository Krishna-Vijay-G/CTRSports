import type { SectionViewProps } from "@/lib/sections/types";
import type { Marquee } from "./model";

/**
 * The ticker: the championship's standing announcements, sliding past.
 *
 * The list is rendered TWICE inside one track. The animation moves the track
 * exactly half its width, at which point the second copy is sitting where the
 * first started — so the loop has no seam and no JavaScript. The second copy is
 * `aria-hidden`, because a screen reader should hear the announcements once.
 *
 * The whole animation is switched off under `prefers-reduced-motion`, which
 * leaves the first few items simply sitting there. That is the right outcome:
 * still readable, just not moving.
 */
export function MarqueeView({ value: marquee }: SectionViewProps<Marquee>) {
  const { items } = marquee;
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Championship announcements"
      className="relative flex overflow-hidden border-y border-line bg-panel py-3"
    >
      {/* Both edges fade into the panel colour so the items appear and vanish
          rather than being cut off by the card's straight edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-panel to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-panel to-transparent"
      />

      <div className="flex w-max animate-marquee">
        <Run items={items} />
        <Run items={items} aria-hidden />
      </div>
    </section>
  );
}

function Run({ items, ...props }: { items: string[] } & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className="flex shrink-0 items-center" {...props}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-center whitespace-nowrap">
          <span className="px-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
            {item}
          </span>
          <span aria-hidden className="block size-1.5 shrink-0 rotate-45 bg-accent" />
        </li>
      ))}
    </ul>
  );
}
