"use client";

import type { DeckSummary } from "@/lib/decks";
import { Label, Select } from "@/admin/ui/Input";
import { Hint } from "@/admin/components/Fields";

/**
 * Points a card at a deck, from the list of decks that exist.
 *
 * ── What gets stored ──────────────────────────────────────────────────────
 *
 * The SLUG, and not the deck's id. An id would be the tidier foreign key, and
 * it is the wrong choice here for the reason FormPicker gives about the same
 * decision: this value lands in a page's JSONB document, and
 * `normaliseIncrcContent` runs in the BROWSER as well as on the server, where
 * it cannot look anything up. A slug is a value the normaliser can check the
 * shape of on its own.
 *
 * What that costs is a rename, and that is paid for elsewhere: renaming a deck
 * pushes the old address into `former_slugs` and /deck/[slug] permanently
 * redirects it, so a card pointing at the old one still opens the right deck.
 *
 * ── There is no "type an address" escape hatch ────────────────────────────
 *
 * Unlike the form picker, which offers one. A form's button may legitimately
 * point anywhere — a page, an anchor, another site — so that field has to stay
 * free text. This card can only ever be a deck: the section reads the name, the
 * cover and the page count off the deck's row, and a typed address would have
 * none of them.
 */
export function DeckPicker({
  label,
  value,
  onChange,
  decks,
}: {
  label: string;
  /** The stored slug. "" is a card pointing at nothing. */
  value: string;
  onChange: (slug: string) => void;
  /** Every published deck. Loaded server-side. */
  decks: DeckSummary[];
}) {
  const chosen = value ? decks.find((deck) => deck.slug === value) : undefined;
  const missing = value !== "" && !chosen;

  return (
    <div className="block">
      <Label>{label}</Label>

      <Select
        value={chosen ? chosen.slug : missing ? "__missing" : ""}
        onChange={(event) => onChange(event.target.value === "__missing" ? "" : event.target.value)}
        className="mt-1.5 w-full"
      >
        <option value="">— pick a deck —</option>

        {/* Kept as an option so opening this does not silently re-point the
            card at whatever happens to be first in the list. */}
        {missing ? <option value="__missing">/deck/{value} — not available</option> : null}

        {decks.map((deck) => (
          <option key={deck.slug} value={deck.slug}>
            {deck.name || deck.slug} · {deck.pages} {deck.pages === 1 ? "page" : "pages"}
          </option>
        ))}
      </Select>

      <Hint className="mt-1">
        {missing ? (
          <span className="text-destructive">
            No published deck answers to that address any more, so this card is not on the page.
            Either it was deleted, or it has been set back to a draft.
          </span>
        ) : chosen ? (
          <>
            Opens <span className="text-foreground">/deck/{chosen.slug}</span>
            {chosen.pages === 0 ? " — which has no pages in it yet." : "."}
          </>
        ) : decks.length === 0 ? (
          "No published decks yet. They are made on the Decks screen."
        ) : (
          "The card shows the deck's own name, cover and page count."
        )}
      </Hint>
    </div>
  );
}
