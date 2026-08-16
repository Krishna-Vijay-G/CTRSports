import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { VISION_GLYPHS } from "@/lib/sections/shared/icons";
import type { SectionViewProps } from "@/lib/sections/types";
import type { Vision } from "./model";

/**
 * What the championship is for.
 *
 * The heading holds its own column on the left and the cards run beside it,
 * rather than a centred heading with a row of cards under it. That is what makes
 * this section feel different from the venues and the calendar, which are both
 * heading-over-grid — three of those in a row would read as one long list.
 */
export function VisionView({ value: vision }: SectionViewProps<Vision>) {
  if (!vision.label && !vision.title && vision.items.length === 0) return null;

  return (
    <section id="vision" className="shell py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
        {/* `.pill-label` is a bordered, filled pill — an empty one is a visible
            outline holding nothing, not nothing at all. */}
        {vision.label || vision.title ? (
          <Reveal className="lg:sticky lg:top-8 lg:self-start">
            {vision.label ? <span className="pill-label">{vision.label}</span> : null}
            {vision.title ? (
              <h2
                className={cn(
                  "headline text-[clamp(1.7rem,3.6vw,2.7rem)]",
                  vision.label && "mt-4"
                )}
              >
                {vision.title}
              </h2>
            ) : null}
          </Reveal>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2">
          {vision.items.map((item, index) => {
            const Glyph = VISION_GLYPHS[item.icon];

            return (
              // The Reveal is INSIDE the li, not around it: a <div> between a
              // <ul> and its <li> is invalid and browsers reparent it.
              <li key={`${item.label}-${index}`} className="flex">
                <Reveal
                  delay={index * 0.06}
                  className="panel-card group flex w-full flex-col p-6 transition-colors duration-300 hover:border-accent/40"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-ink transition-transform duration-300 group-hover:-translate-y-0.5"
                  >
                    <Glyph />
                  </span>
                  <h3 className="mt-5 font-display text-base font-bold leading-snug text-fg">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
