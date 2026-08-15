import type { IncrcContent } from "@/lib/incrcContent";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The one thing the page asks for.
 *
 * The accent band, as on the landing page — `accent-ink` is the only colour
 * allowed on top of it, so every piece of type here says so explicitly.
 */
export function RegisterBand({ register }: { register: IncrcContent["register"] }) {
  // Nothing to ask for is no band. The band is a flat accent rectangle 14rem
  // tall with a blur laid over one corner — with no words in it that is not a
  // quiet section, it is the loudest thing on the page saying nothing at all.
  if (!register.kicker && !register.title && !register.body && !register.ctaLabel) return null;

  // Registration lives on this site now — at /register/<slug>, or at the
  // section on this page that lists the open forms. This is left in place for
  // the one case it still serves: an admin who has deliberately typed an
  // outside address into the picker's escape hatch. A link that leaves should
  // open in its own tab rather than lose the page someone is reading; an
  // in-page anchor and a path on this site must not.
  const offSite = register.ctaHref.startsWith("http");

  return (
    <section id="register" className="shell pb-16 pt-4 sm:pb-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-card bg-accent px-6 py-14 text-center sm:px-10">
          {/* A soft wash off the corner, in the ink colour — the band is one flat
              yellow otherwise, which is a lot of it at this size. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-ink/10 blur-3xl"
          />

          <div className="relative">
            {register.kicker ? (
              <span className="inline-flex items-center rounded-full border border-accent-ink/25 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                {register.kicker}
              </span>
            ) : null}

            {register.title ? (
              <h2
                className={cn(
                  "headline text-[clamp(1.75rem,3.6vw,3rem)] text-accent-ink",
                  register.kicker && "mt-5"
                )}
              >
                {register.title}
              </h2>
            ) : null}

            {register.body ? (
              <p
                className={cn(
                  "mx-auto max-w-2xl text-[15px] leading-relaxed text-accent-ink/75",
                  (register.kicker || register.title) && "mt-4"
                )}
              >
                {register.body}
              </p>
            ) : null}

            {register.ctaLabel ? (
              <div className="mt-8 flex justify-center">
                <ActionButton
                  href={register.ctaHref}
                  variant="white"
                  target={offSite ? "_blank" : undefined}
                  rel={offSite ? "noreferrer" : undefined}
                >
                  {register.ctaLabel}
                </ActionButton>
              </div>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
