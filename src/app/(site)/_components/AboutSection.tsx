"use client";

import { paragraphs, type LabelledPhoto, type LandingContent } from "@/lib/landingContent";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Who CTR is: a photo, the copy, a photo. All of it from the database, edited
 * at /admin/landing.
 *
 * The photos flank the copy from `md:` up and stack under it below that, where
 * three columns would leave the text a few words wide.
 */
export function AboutSection({ about }: { about: LandingContent["about"] }) {
  return (
    <section id="about" className="shell py-16 sm:py-20">
      <SectionHeading label={about.label} title={about.title} layout="split" />

      <div className="mt-10 grid gap-5 md:grid-cols-3 md:items-stretch">
        <AboutPhoto photo={about.photos[0]} />

        <Reveal delay={0.1} className="flex">
          <div className="flex flex-col justify-center px-1 py-4 text-center md:px-3 md:text-left">
            <h3 className="headline text-2xl">{about.heading}</h3>
            {paragraphs(about.body).map((paragraph, index) => (
              <p key={index} className="body-copy mt-3">
                {paragraph}
              </p>
            ))}
            {about.ctaLabel ? (
              <div className="mt-6 flex justify-center md:justify-start">
                <ActionButton href={about.ctaHref} variant="outline">
                  {about.ctaLabel}
                </ActionButton>
              </div>
            ) : null}
          </div>
        </Reveal>

        <AboutPhoto photo={about.photos[1]} delay={0.18} />
      </div>
    </section>
  );
}

function AboutPhoto({ photo, delay = 0 }: { photo: LabelledPhoto; delay?: number }) {
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
        {photo.label ? (
          <figcaption className="photo-chip absolute bottom-3 left-3">{photo.label}</figcaption>
        ) : null}
      </figure>
    </Reveal>
  );
}
