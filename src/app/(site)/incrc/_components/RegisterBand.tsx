import type { IncrcContent } from "@/lib/incrcContent";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The one thing the page asks for.
 *
 * The accent band, as on the landing page — `accent-ink` is the only colour
 * allowed on top of it, so every piece of type here says so explicitly.
 */
export function RegisterBand({ register }: { register: IncrcContent["register"] }) {
  // The entry form lives on the older CTR site, so this usually leaves this
  // site — and a link that leaves should open in its own tab rather than lose
  // the page someone is reading. An in-page anchor must not.
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

            <h2 className="headline mt-5 text-[clamp(1.75rem,3.6vw,3rem)] text-accent-ink">
              {register.title}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-accent-ink/75">
              {register.body}
            </p>

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
