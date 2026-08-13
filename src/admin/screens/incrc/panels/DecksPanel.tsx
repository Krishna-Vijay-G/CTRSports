"use client";

import type { DeckSummary } from "@/lib/decks";
import { MAX_DECK_CARDS, type DeckCard, type IncrcContent } from "@/lib/incrcContent";
import { DeckPicker } from "@/admin/components/DeckPicker";
import { Field, Panel, TextArea } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";

type Decks = IncrcContent["decks"];

/**
 * The cards linking to decks: the heading, and which decks appear.
 *
 * Which ones IS editable here, unlike the entry forms panel next to it — and
 * the difference is what the two things are. Every published form assigned to
 * this page belongs on this page. A deck belongs to nobody: the Decks screen
 * holds the entry pack this page wants alongside the sponsorship deck it does
 * not, so somebody has to choose, and this is where.
 *
 * The cards' words come from the decks themselves, so a deck renamed on its own
 * screen is renamed on every page pointing at it. The two fields under the
 * picker are overrides for the page that needs to call one something else in
 * context, and are blank almost always.
 */
export function DecksPanel({
  value,
  onChange,
  decks,
}: {
  value: Decks;
  onChange: (next: Decks) => void;
  /** Every published deck, read-only here: they are made on the Decks screen. */
  decks: DeckSummary[];
}) {
  const set = (patch: Partial<Decks>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea
            label="Body"
            value={value.body}
            onChange={(body) => set({ body })}
            rows={2}
            hint="The line under the heading. Blank hides it."
          />
        </div>
      </Panel>

      <Repeater<DeckCard>
        title="Cards"
        addLabel="Add a card"
        items={value.items}
        max={MAX_DECK_CARDS}
        onChange={(items) => set({ items })}
        blank={() => ({ slug: "", title: "", blurb: "" })}
        expand="accordion"
        summary={(card) => {
          const deck = decks.find((entry) => entry.slug === card.slug);

          return {
            title: card.title || deck?.name || (card.slug ? `/deck/${card.slug}` : "No deck yet"),
            hint: deck
              ? `/deck/${deck.slug} · ${deck.pages} ${deck.pages === 1 ? "page" : "pages"}`
              : card.slug
                ? "Not available — this card is not on the page"
                : "Pick a deck",
            image: deck?.cover || undefined,
          };
        }}
        empty="No cards yet. The whole section stays off the page until there is one."
        note="A card whose deck has been deleted or set back to a draft is left off the page rather than shown as a dead link. With no cards at all, the heading is not drawn either."
      >
        {(card, _index, patch) => (
          <div className="space-y-3">
            <DeckPicker
              label="Deck"
              value={card.slug}
              onChange={(slug) => patch({ slug })}
              decks={decks}
            />
            <Field
              label="Title on the card"
              value={card.title}
              onChange={(title) => patch({ title })}
              placeholder={decks.find((deck) => deck.slug === card.slug)?.name || "The deck's name"}
              hint="Blank uses the deck's own name, which is what you want unless this page calls it something else."
            />
            <TextArea
              label="Line on the card"
              value={card.blurb}
              onChange={(blurb) => patch({ blurb })}
              rows={2}
              placeholder={
                decks.find((deck) => deck.slug === card.slug)?.blurb || "The deck's own line"
              }
              hint="Blank uses the deck's own line."
            />
          </div>
        )}
      </Repeater>
    </>
  );
}
