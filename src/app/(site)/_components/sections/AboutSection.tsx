"use client";

import { paragraphs, type LabelledPhoto, type LandingContent } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Who CTR is: a photo, the copy, a photo. All of it from the database, edited
 * at /admin/landing.
 *
 * The photos flank the copy from `md:` up and stack under it below that, where
 * three columns would leave the text a few words wide.
 *
 * ── Nothing written is nothing drawn ──────────────────────────────────────
 *
 * Every wrapper here paints something of its own, so blank content used to come
 * out as the shape of the section with none of it in it: two 16rem rounded
 * panels holding broken images, and 128px of padding around them. An `<img>`
 * with no `src` is the worst of the three — the browser resolves "" against the
 * page, re-requests the page itself, and draws the frame around what comes back.
 *
 * So a photo with no file is not a frame, copy that was never written takes no
 * margin, and a section with neither is not on the page.
 */
export function AboutSection({ about }: { about: LandingContent["about"] }) {
  const photos = about.photos.filter((photo) => photo.src);
  const copy = about.heading || about.body || about.ctaLabel;
  const heading = about.label || about.title;

  if (!heading && !copy && photos.length === 0) return null;

  return (
    <section id="about" className="shell py-16 sm:py-20">
      <SectionHeading label={about.label} title={about.title} layout="split" />

      {copy || photos.length > 0 ? (
        <div
          className={cn(
            "grid gap-5 md:grid-cols-3 md:items-stretch",
            heading && "mt-10"
          )}
        >
          <AboutPhoto photo={about.photos[0]} />

          {copy ? (
            <Reveal delay={0.1} className="flex">
              <div className="flex flex-col justify-center px-1 py-4 text-center md:px-3 md:text-left">
                {about.heading ? <h3 className="headline text-2xl">{about.heading}</h3> : null}
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
          ) : null}

          <AboutPhoto photo={about.photos[1]} delay={0.18} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * One flanking photo, or nothing.
 *
 * `photo` is undefined when the list is shorter than two, and its `src` is ""
 * when the slot exists but no file was chosen. Both mean the same thing here:
 * there is no picture, so there is no frame to draw around one.
 */
function AboutPhoto({ photo, delay = 0 }: { photo?: LabelledPhoto; delay?: number }) {
  if (!photo?.src) return null;

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
