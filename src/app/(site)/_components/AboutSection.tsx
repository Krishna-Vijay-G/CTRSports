import { ABOUT } from "@/config/site";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Who CTR is. Copy lives in ABOUT in src/config/site.ts — edit and redeploy. */
export function AboutSection() {
  return (
    <section id="about" className="section-shell py-20 sm:py-24">
      <SectionHeading kicker={ABOUT.kicker} title={ABOUT.title} />

      <div className="mt-8 max-w-3xl space-y-5">
        {ABOUT.body.map((paragraph, index) => (
          <Reveal key={index} delay={0.08 * index} y={24}>
            <p className="text-base leading-relaxed text-white/65 sm:text-lg">{paragraph}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
