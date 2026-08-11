import type { LandingContent } from "@/lib/landingContent";
import { ActionButton } from "@/components/ui/ActionButton";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { INCRC, REGISTER_HREF } from "../_data/incrc";
import { FollowButton } from "./FollowButton";

/**
 * The opening panel.
 *
 * Deliberately typographic rather than photographic: the championship's
 * photography is a circuit render, a car line-up and a grid portrait, and none
 * of them is large enough to fill a hero without being stretched soft. The three
 * names on the championship carry it instead — which is also the fastest way to
 * say what this is.
 *
 * The header is laid over it exactly as it is on the landing page, so this panel
 * owns the top padding the header needs.
 */
export function IncrcHero({ content }: { content: LandingContent }) {
  return (
    <section className="relative overflow-hidden rounded-card">
      {/* A wash from the corner rather than a photograph — enough to stop the
          panel reading as a flat rectangle, not enough to compete with type. */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />

      <SiteHeader content={content} />

      <div className="shell relative z-10 flex min-h-[560px] flex-col justify-center pb-16 pt-32 lg:min-h-[640px]">
        <p className="inline-flex w-fit items-center gap-2 text-sm font-semibold tracking-wide">
          <span aria-hidden className="flex gap-1">
            <span className="block h-3.5 w-2 rounded-sm bg-[#FF9933]" />
            <span className="block h-3.5 w-2 rounded-sm bg-white" />
            <span className="block h-3.5 w-2 rounded-sm bg-[#138808]" />
          </span>
          <span className="ml-1 text-fg-muted">{INCRC.tagline}</span>
        </p>

        <h1 className="headline mt-6 max-w-4xl text-[clamp(2.25rem,5.4vw,3.75rem)]">
          {INCRC.headline}
        </h1>

        <p className="body-copy mt-5 max-w-xl">{INCRC.intro[0]}</p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <ActionButton href={REGISTER_HREF}>{INCRC.registration.ctaLabel}</ActionButton>
          <FollowButton />
        </div>

        <PartnerLockup className="mt-14" />
      </div>
    </section>
  );
}

/**
 * The three names on the championship, on one rule.
 *
 * White backing on each mark: two of the three are dark-ink wordmarks that go
 * muddy on a near-black tile, which is the same reason sport crests get a white
 * tile everywhere else on this site.
 */
function PartnerLockup({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-faint">
        Presented by
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-3">
        {INCRC.partners.map((partner) => (
          <li
            key={partner.name}
            className="flex h-14 items-center rounded-panel bg-white px-5"
            title={partner.name}
          >
            <img
              src={partner.logo}
              alt={partner.name}
              loading="lazy"
              decoding="async"
              className="h-8 w-auto max-w-[140px] object-contain"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
