import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { LinkPill } from "./LinkPill";
import { Tricolour } from "./icons";

/**
 * The one full-bleed moment on the page: who actually makes a race weekend
 * happen.
 *
 * Breaks the `.shell` rhythm on purpose — it is the page's single change of
 * pace, and a quote that stops at the same margin as the cards above it would
 * not read as one.
 *
 * The chips under the quote are the page's send-off, so they are a list rather
 * than the one fixed Instagram button this band used to carry: the family the
 * quote is about is more than one account, and where a reader should be sent
 * next is an editorial decision, not a constant. No chips leaves the quote on
 * its own, which is a perfectly good ending.
 */
export function FamilyBanner({ family }: { family: IncrcContent["family"] }) {
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
          {family.lead ? (
            <p className="font-display text-lg font-semibold text-fg-muted md:text-xl">
              {family.lead}
            </p>
          ) : null}

          {family.showFlag ? (
            <span aria-hidden className="my-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-accent/50" />
              <Tricolour />
              <span className="h-px w-10 bg-accent/50" />
            </span>
          ) : (
            <span aria-hidden className="my-5 block h-px w-16 bg-accent/50 mx-auto" />
          )}

          <p className="headline mx-auto max-w-4xl text-[clamp(1.8rem,5vw,3.5rem)]">
            {family.quote}
          </p>

          {family.links.length > 0 ? (
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {family.links.map((chip) => (
                <LinkPill
                  key={chip.id}
                  icon={chip.icon}
                  label={chip.label}
                  note={chip.note}
                  href={chip.href}
                  tone="light"
                />
              ))}
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
