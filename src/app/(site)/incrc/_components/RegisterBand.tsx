import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { INCRC, REGISTER_HREF } from "../_data/incrc";

/**
 * The last thing on the page, and the only thing it asks for.
 *
 * The accent band, as on the landing page — `accent-ink` is the only colour
 * allowed on top of it, so every piece of type here says so explicitly.
 */
export function RegisterBand() {
  const { registration } = INCRC;

  return (
    <section id="register" className="shell pb-16 pt-4 sm:pb-20">
      <Reveal>
        <div className="rounded-card bg-accent px-6 py-14 text-center sm:px-10">
          <span className="inline-flex items-center rounded-full border border-accent-ink/25 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-ink">
            {registration.kicker}
          </span>

          <h2 className="headline mt-5 text-[clamp(1.75rem,3.6vw,3rem)] text-accent-ink">
            {registration.title}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-accent-ink/75">
            {registration.lead}
          </p>

          <div className="mt-8 flex justify-center">
            {/* Leaves this site for the entry form, so it opens in its own tab
                rather than losing the page someone is reading. */}
            <ActionButton
              href={REGISTER_HREF}
              variant="white"
              target="_blank"
              rel="noreferrer"
            >
              {registration.ctaLabel}
            </ActionButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
