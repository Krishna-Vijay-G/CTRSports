import Link from "next/link";
import type { DeckSummary } from "@/lib/decks";
import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Cards pointing at decks — the entry pack, the regulations, the brief.
 *
 * ── Which decks ───────────────────────────────────────────────────────────
 *
 * The ones this page picked, by address, unlike the entry forms above it. Every
 * published form for this page belongs on this page; a deck belongs to nobody,
 * so the same screen holds the pack this page wants and the sponsorship deck it
 * does not. Which appear is an editorial choice, and it is stored.
 *
 * A card whose deck has been deleted or set back to a draft is DROPPED, not
 * drawn greyed out. That differs from a closed entry form on purpose: a closed
 * form is an answer somebody came looking for, while a deck that is no longer
 * published is not a fact about the championship — it is a page that is not
 * there. Nothing to show means nothing rendered, which matters here because this
 * section's id was appended to INCRC_SECTION_IDS and so is switched ON for every
 * stored document.
 *
 * The card's words come from the DECK, so renaming one corrects every page
 * pointing at it. The stored title and blurb are overrides for the page that
 * needs to call it something else in context.
 */
export function DecksSection({
  decks: copy,
  available,
}: {
  /** The heading and the picked cards, from the page's own document. */
  decks: IncrcContent["decks"];
  /** Every published deck, from ctr.decks. Passed in — this may be a preview. */
  available: DeckSummary[];
}) {
  const cards = copy.items
    .map((card) => ({ card, deck: available.find((deck) => deck.slug === card.slug) }))
    .filter((entry): entry is { card: (typeof copy.items)[number]; deck: DeckSummary } =>
      Boolean(entry.deck)
    );

  if (cards.length === 0) return null;

  return (
    <section id="decks" className="shell py-16 sm:py-20">
      <SectionHeading label={copy.label} title={copy.title} />

      {copy.body ? (
        <Reveal className="mt-5">
          <p className="body-copy mx-auto max-w-2xl text-center">{copy.body}</p>
        </Reveal>
      ) : null}

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ card, deck }, index) => (
          // The Reveal is INSIDE the li: a <div> between a <ul> and its <li> is
          // invalid and browsers reparent it.
          <li key={deck.slug} className="flex">
            <Reveal delay={Math.min(index, 5) * 0.06} className="flex w-full">
              <Link
                href={`/deck/${deck.slug}`}
                className="panel-card group flex h-full w-full flex-col overflow-hidden transition-colors duration-300 hover:border-accent/40"
              >
                {deck.cover ? (
                  // The deck's first page, cropped to a band. It is the one
                  // thing that says what this document actually is before it is
                  // opened.
                  <span className="block aspect-[16/10] w-full overflow-hidden bg-page">
                    <img
                      src={deck.cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </span>
                ) : null}

                <span className="flex flex-1 flex-col p-6">
                  <span className="font-display text-lg font-bold leading-snug text-fg transition-colors group-hover:text-accent">
                    {card.title || deck.name}
                  </span>

                  {card.blurb || deck.blurb ? (
                    <span className="mt-2 block text-sm leading-relaxed text-fg-muted">
                      {card.blurb || deck.blurb}
                    </span>
                  ) : null}

                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[13px] font-semibold text-fg-faint transition-colors group-hover:text-accent">
                    {deck.pages === 1 ? "1 page" : `${deck.pages} pages`}
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      &rarr;
                    </span>
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
