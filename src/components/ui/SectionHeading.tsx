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
  if (layout === "split") {
    return (
      <Reveal className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
        <span className="pill-label w-fit">{label}</span>
        <h2 className="headline max-w-2xl text-[clamp(1.75rem,3.4vw,2.75rem)] md:text-right">
          {title}
        </h2>
      </Reveal>
    );
  }

  return (
    <Reveal className={cn("flex flex-col items-center text-center", className)}>
      <span className="pill-label">{label}</span>
      <h2 className="headline mt-4 max-w-3xl text-[clamp(1.75rem,3.6vw,3rem)]">{title}</h2>
    </Reveal>
  );
}
