import type { IncrcContent } from "@/lib/incrcContent";
import { paragraphs } from "@/lib/landingContent";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { FollowButton } from "./FollowButton";
import { Tricolour } from "./icons";

/**
 * What the championship is, in one headline and two paragraphs, with the three
 * names on it alongside.
 *
 * Two columns rather than a centred block: the partner marks need a column of
 * their own — they are three white tiles and they would break a centred column
 * of type in half.
 */
export function IntroSection({
  intro,
  meta,
}: {
  intro: IncrcContent["intro"];
  meta: IncrcContent["meta"];
}) {
  return (
    <section id="intro" className="shell py-16 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <Reveal>
          {intro.kicker ? (
            <p className="inline-flex w-fit items-center gap-2.5 text-sm font-semibold tracking-wide">
              <Tricolour />
              <span className="text-fg-muted">{intro.kicker}</span>
            </p>
          ) : null}

          {intro.headline ? (
            <h2 className="headline mt-6 max-w-3xl text-[clamp(1.9rem,4.4vw,3.15rem)]">
              {intro.headline}
            </h2>
          ) : null}

          {paragraphs(intro.body).map((line) => (
            <p key={line} className="body-copy mt-4 max-w-xl">
              {line}
            </p>
          ))}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {intro.ctaLabel ? (
              <ActionButton href={intro.ctaHref}>{intro.ctaLabel}</ActionButton>
            ) : null}
            <FollowButton href={meta.instagram} handle={meta.handle} />
          </div>
        </Reveal>

        {intro.partners.length > 0 ? (
          <Reveal delay={0.1}>
            <div className="panel-card p-6 sm:p-8">
              {intro.partnersLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-faint">
                  {intro.partnersLabel}
                </p>
              ) : null}

              {/*
                White backing on each mark: two of the three are dark-ink
                wordmarks that go muddy on a near-black tile, which is the same
                reason sport crests get a white tile everywhere else on this site.
              */}
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {intro.partners.map((partner) => (
                  <li
                    key={`${partner.name}-${partner.logo}`}
                    className="h-16 overflow-hidden rounded-panel bg-white"
                    title={partner.name}
                  >
                    <PartnerMark partner={partner} />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/**
 * One mark, as a link when it has somewhere to go and a picture when it does not.
 *
 * The tile is the same either way — a mark that happens to be linked must not
 * look like a different kind of thing from the one beside it that is not — so
 * the only difference a visitor sees is the cursor and a slight lift on hover.
 *
 * The whole tile is the target rather than the image inside it, padding
 * included. A wordmark is a wide thin shape with a lot of white either side of
 * it, and a link that only answers on the ink is a link most people miss.
 */
function PartnerMark({ partner }: { partner: IncrcContent["intro"]["partners"][number] }) {
  const mark = (
    <img
      src={partner.logo}
      alt={partner.name}
      loading="lazy"
      decoding="async"
      className="h-9 w-auto max-w-[160px] object-contain"
    />
  );

  const inside = "flex h-full w-full items-center justify-center px-6";

  if (!partner.href) return <span className={inside}>{mark}</span>;

  // Somewhere else entirely opens in its own tab rather than taking away the
  // page being read; a path on this site and a #section must not. The same rule
  // the register band and the family chips follow.
  const offSite = partner.href.startsWith("http");

  return (
    <a
      href={partner.href}
      target={offSite ? "_blank" : undefined}
      rel={offSite ? "noreferrer" : undefined}
      className={`${inside} transition-opacity duration-300 hover:opacity-70`}
    >
      {mark}
    </a>
  );
}
