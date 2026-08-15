import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/**
 * A small outlined chip naming the section, with the headline beside or below
 * it. Keeping both shapes here is what stops the fourth section from inventing
 * its own type scale.
 *
 * `split` puts the chip and the headline on opposite ends of a row — the
 * arrangement the about section uses. `center` stacks them, which is what the
 * sports grid and the call-to-action band use.
 *
 * ── Blank is nothing, not an empty box ────────────────────────────────────
 *
 * Both halves used to render whatever they were handed, and `.pill-label` is a
 * bordered, filled, padded pill — so a section whose label had not been written
 * yet drew a 32×27px outline with nothing in it, five times down a page. That
 * reads as a page that failed to load rather than as a heading nobody has
 * typed.
 *
 * So each half is drawn only when it has words, and the pair is drawn only when
 * one of them does. The margin between them goes with the chip: `mt-4` under a
 * chip that is not there is a gap with nothing above it.
 */
export function SectionHeading({
  label,
  title,
  layout = "center",
  className,
}: {
  label: string;
  title: string;
  layout?: "center" | "split";
  className?: string;
}) {
  if (!label && !title) return null;

  if (layout === "split") {
    return (
      <Reveal
        className={cn(
          "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
          className
        )}
      >
        {label ? <span className="pill-label w-fit">{label}</span> : null}
        {title ? (
          <h2 className="headline max-w-2xl text-[clamp(1.75rem,3.4vw,2.75rem)] md:text-right">
            {title}
          </h2>
        ) : null}
      </Reveal>
    );
  }

  return (
    <Reveal className={cn("flex flex-col items-center text-center", className)}>
      {label ? <span className="pill-label">{label}</span> : null}
      {title ? (
        <h2
          className={cn(
            "headline max-w-3xl text-[clamp(1.75rem,3.6vw,3rem)]",
            label && "mt-4"
          )}
        >
          {title}
        </h2>
      ) : null}
    </Reveal>
  );
}
