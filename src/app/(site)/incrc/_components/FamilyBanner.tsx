import { Reveal } from "@/components/ui/Reveal";
import { INCRC } from "../_data/incrc";
import { FollowButton } from "./FollowButton";

/**
 * The one full-bleed moment on the page: who actually makes a race weekend
 * happen.
 *
 * Breaks the `.shell` rhythm on purpose — it is the page's single change of
 * pace, and a quote that stops at the same margin as the cards above it would
 * not read as one.
 */
export function FamilyBanner() {
  const { family } = INCRC;

  return (
    <section className="relative min-h-[420px] overflow-hidden md:min-h-[520px]">
      <img
        src={family.image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Heavy, and heaviest at the foot: the quote is large and centred, so it
          crosses whatever the photograph is doing in the middle. */}
      <div className="absolute inset-0 bg-gradient-to-t from-page via-page/75 to-page/45" />

      <Reveal className="relative z-10 flex min-h-[420px] flex-col items-center justify-center py-16 text-center md:min-h-[520px]">
        <div className="shell">
          <p className="font-display text-lg font-semibold text-fg-muted md:text-xl">
            {family.lead}
          </p>

          <span aria-hidden className="my-5 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-accent/50" />
            <span className="flex gap-1">
              <span className="block h-3.5 w-2 rounded-sm bg-[#FF9933]" />
              <span className="block h-3.5 w-2 rounded-sm bg-white" />
              <span className="block h-3.5 w-2 rounded-sm bg-[#138808]" />
            </span>
            <span className="h-px w-10 bg-accent/50" />
          </span>

          <p className="headline mx-auto max-w-4xl text-[clamp(1.8rem,5vw,3.5rem)]">
            {family.quote}
          </p>

          <div className="mt-9 flex justify-center">
            <FollowButton tone="light" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
