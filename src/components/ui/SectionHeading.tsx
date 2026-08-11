import { Reveal } from "@/components/ui/Reveal";

/**
 * The kicker-over-title pair that opens every section. Keeping it in one place
 * is what stops the fourth section from inventing its own type scale.
 */
export function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="kicker">{kicker}</p>
      <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
    </Reveal>
  );
}
