import { ABOUT } from "@/config/site";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Who CTR is: a photo, the copy, a photo. Copy and photos both come from
 * src/config/site.ts — edit and redeploy.
 *
 * The photos flank the copy from `md:` up and stack under it below that, where
 * three columns would leave the text a few words wide.
 */
export function AboutSection() {
  return (
    <section id="about" className="shell py-16 sm:py-20">
      <SectionHeading label={ABOUT.label} title={ABOUT.title} layout="split" />

      <div className="mt-10 grid gap-5 md:grid-cols-3 md:items-stretch">
        <AboutPhoto photo={ABOUT.photos[0]} />

        <Reveal delay={0.1} className="flex">
          <div className="flex flex-col justify-center px-1 py-4 text-center md:px-3 md:text-left">
            <h3 className="headline text-2xl">{ABOUT.heading}</h3>
            {ABOUT.body.map((paragraph, index) => (
              <p key={index} className="body-copy mt-3">
                {paragraph}
              </p>
            ))}
            <div className="mt-6 flex justify-center md:justify-start">
              <ActionButton href={ABOUT.cta.href} variant="outline">
                {ABOUT.cta.label}
              </ActionButton>
            </div>
          </div>
        </Reveal>

        <AboutPhoto photo={ABOUT.photos[1]} delay={0.18} />
      </div>
    </section>
  );
}

function AboutPhoto({
  photo,
  delay = 0,
}: {
  photo: { src: string; label: string };
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <figure className="relative h-64 overflow-hidden rounded-panel md:h-full md:min-h-[22rem]">
        <img
          src={photo.src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <figcaption className="photo-chip absolute bottom-3 left-3">{photo.label}</figcaption>
      </figure>
    </Reveal>
  );
}
